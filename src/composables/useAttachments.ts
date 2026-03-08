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

  async function abrirAnexo(identificador: string, _nome = 'Arquivo') {
    await garantirAnexoUrl(identificador)
    const url = anexosUrl.value[identificador]
    if (!url) return

    // For cross-origin signed URLs, browsers can ignore download attribute.
    // Open in a new tab to let the browser handle range/stream/download behavior.
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function limparAnexos() {
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