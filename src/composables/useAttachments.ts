import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getAnexoUrl } from '../services/conversaApi'

export function useAttachments() {
  const auth = useAuthStore()
  const anexosUrl = ref<Record<string, string>>({})
  const anexosCarregando = new Set<string>()

  async function garantirAnexoUrl(identificador: string) {
    if (!identificador || anexosUrl.value[identificador] || anexosCarregando.has(identificador)) {
      return
    }

    anexosCarregando.add(identificador)
    try {
      const urlAnexo = await getAnexoUrl(identificador)
      const resposta = await fetch(urlAnexo)

      if (!resposta.ok) {
        throw new Error(`Erro ao obter anexo: HTTP ${resposta.status}`)
      }

      const blob = await resposta.blob()
      const url = URL.createObjectURL(blob)
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

    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.download = nome
    link.click()
  }

  function limparAnexos() {
    for (const url of Object.values(anexosUrl.value)) {
      URL.revokeObjectURL(url)
    }
    anexosUrl.value = {}
  }

  return {
    anexosUrl,
    anexoUrl,
    garantirAnexoUrl,
    abrirAnexo,
    limparAnexos
  }
}
