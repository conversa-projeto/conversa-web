import { ref, watch, onUnmounted } from 'vue'
import { useChatStore } from '../stores/chat'

export function useImagePreview(onSent: () => void) {
  const chat = useChatStore()

  const previewImagemAberta = ref(false)
  const previewImagemUrl = ref('')
  const previewImagemNome = ref('imagem.png')
  const previewImagemMime = ref('image/png')
  const previewImagemBlob = ref<Blob | null>(null)

  function abrirPreviewImagem(blob: Blob, nome: string, mime: string) {
    if (previewImagemUrl.value) {
      URL.revokeObjectURL(previewImagemUrl.value)
    }
    previewImagemBlob.value = blob
    previewImagemNome.value = nome
    previewImagemMime.value = mime || 'image/png'
    previewImagemUrl.value = URL.createObjectURL(blob)
    previewImagemAberta.value = true
  }

  function fecharPreviewImagem() {
    previewImagemAberta.value = false
    if (previewImagemUrl.value) {
      URL.revokeObjectURL(previewImagemUrl.value)
    }
    previewImagemUrl.value = ''
    previewImagemNome.value = 'imagem.png'
    previewImagemMime.value = 'image/png'
    previewImagemBlob.value = null
  }

  async function confirmarEnvioPreviewImagem() {
    if (!previewImagemBlob.value) return

    await chat.enviarArquivo(previewImagemBlob.value, previewImagemNome.value, previewImagemMime.value, false)
    fecharPreviewImagem()
    onSent()
  }

  watch(previewImagemAberta, (aberta) => {
    document.body.style.overflow = aberta ? 'hidden' : ''
  })

  onUnmounted(() => {
    if (previewImagemUrl.value) {
      URL.revokeObjectURL(previewImagemUrl.value)
    }
    document.body.style.overflow = ''
  })

  return {
    previewImagemAberta,
    previewImagemUrl,
    previewImagemNome,
    previewImagemMime,
    previewImagemBlob,
    abrirPreviewImagem,
    fecharPreviewImagem,
    confirmarEnvioPreviewImagem,
  }
}
