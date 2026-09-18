import { ref } from 'vue'
import { getAnexoUrl } from '../services/conversaApi'

// A URL assinada do MinIO vence (o servidor assina por alguns minutos). A
// validade vem na propria URL, em X-Amz-Date e X-Amz-Expires, e e guardada
// aqui: sem isso a URL em cache continuava sendo usada depois de vencida e o
// MinIO recusava o acesso ate a pagina ser recarregada.
const MARGEM_RENOVACAO_MS = 60_000

function expiracaoDaUrl(url: string): number {
  try {
    const parametros = new URL(url).searchParams
    const data = parametros.get('X-Amz-Date')
    const segundos = Number(parametros.get('X-Amz-Expires'))
    if (!data || !segundos) {
      return 0
    }
    const iso = `${data.slice(0, 4)}-${data.slice(4, 6)}-${data.slice(6, 8)}T${data.slice(9, 11)}:${data.slice(11, 13)}:${data.slice(13, 15)}Z`
    const assinadaEm = Date.parse(iso)
    return Number.isNaN(assinadaEm) ? 0 : assinadaEm + segundos * 1000
  } catch {
    return 0
  }
}

export function useAttachments() {
  const anexosUrl = ref<Record<string, string>>({})
  const anexosCarregando = new Set<string>()
  const expiracoes = new Map<string, number>()

  function urlValida(identificador: string) {
    const url = anexosUrl.value[identificador]
    if (!url) {
      return false
    }
    const expiraEm = expiracoes.get(identificador) ?? expiracaoDaUrl(url)
    expiracoes.set(identificador, expiraEm)
    return expiraEm - MARGEM_RENOVACAO_MS > Date.now()
  }

  function guardarUrl(identificador: string, url: string) {
    expiracoes.set(identificador, expiracaoDaUrl(url))
    anexosUrl.value = { ...anexosUrl.value, [identificador]: url }
  }

  async function garantirAnexoUrl(identificador: string) {
    if (!identificador || anexosCarregando.has(identificador) || urlValida(identificador)) {
      return
    }

    anexosCarregando.add(identificador)
    try {
      guardarUrl(identificador, await getAnexoUrl(identificador))
    } finally {
      anexosCarregando.delete(identificador)
    }
  }

  function anexoUrl(identificador: string): string {
    if (!urlValida(identificador)) {
      void garantirAnexoUrl(identificador)
    }
    return anexosUrl.value[identificador] || ''
  }

  async function abrirAnexo(identificador: string, nome = 'Arquivo') {
    await garantirAnexoUrl(identificador)
    const url = anexosUrl.value[identificador]
    if (!url) return

    try {
      // Fetch via blob para contornar restrição cross-origin no atributo download
      const resp = await fetch(url)
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = nome
      a.click()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const renovacoesTentadas = new Set<string>()

  async function renovarAnexoUrl(identificador: string) {
    if (!identificador || renovacoesTentadas.has(identificador) || anexosCarregando.has(identificador)) return
    renovacoesTentadas.add(identificador)

    // Limpar URL em cache para forçar nova busca
    const { [identificador]: _, ...resto } = anexosUrl.value
    anexosUrl.value = resto
    expiracoes.delete(identificador)

    anexosCarregando.add(identificador)
    try {
      guardarUrl(identificador, await getAnexoUrl(identificador))
    } finally {
      anexosCarregando.delete(identificador)
      // Permitir nova tentativa após 60s
      setTimeout(() => renovacoesTentadas.delete(identificador), 60_000)
    }
  }

  function limparAnexos() {
    anexosUrl.value = {}
    expiracoes.clear()
    renovacoesTentadas.clear()
  }

  return {
    anexosUrl,
    anexoUrl,
    garantirAnexoUrl,
    renovarAnexoUrl,
    abrirAnexo,
    limparAnexos
  }
}
