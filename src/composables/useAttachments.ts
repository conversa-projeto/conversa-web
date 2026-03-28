import { ref } from 'vue'
import { getAnexoUrl } from '../services/conversaApi'

export function useAttachments() {
  const anexosUrl = ref<Record<string, string>>({})
  const anexosCarregando = new Set<string>()

  async function garantirAnexoUrl(identificador: string) {
    if (!identificador || anexosUrl.value[identificador] || anexosCarregando.has(identificador)) {
      return
    }

    anexosCarregando.add(identificador)
    try {
      const url = await getAnexoUrl(identificador)
      anexosUrl.value = {
        ...anexosUrl.value,
        [identificador]: url
      }
    } finally {
      anexosCarregando.delete(identificador)
    }
  }

  function anexoUrl(identificador: string): string {
    if (!anexosUrl.value[identificador]) {
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

    anexosCarregando.add(identificador)
    try {
      const url = await getAnexoUrl(identificador)
      anexosUrl.value = { ...anexosUrl.value, [identificador]: url }
    } finally {
      anexosCarregando.delete(identificador)
      // Permitir nova tentativa após 60s
      setTimeout(() => renovacoesTentadas.delete(identificador), 60_000)
    }
  }

  function limparAnexos() {
    anexosUrl.value = {}
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