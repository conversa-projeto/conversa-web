import { ref, watch, onMounted, onUnmounted } from 'vue'

export function useImageViewer(garantirAnexoUrl: (id: string) => Promise<void>, anexosUrl: { value: Record<string, string> }) {
  const imagemTelaCheiaAberta = ref(false)
  const imagemTelaCheiaUrl = ref('')
  const imagemTelaCheiaNome = ref('Imagem')
  const zoomImagemTelaCheia = ref(1)

  function ajustarZoomImagem(delta: number) {
    const novoZoom = Math.min(5, Math.max(1, zoomImagemTelaCheia.value + delta))
    zoomImagemTelaCheia.value = Number(novoZoom.toFixed(2))
  }

  function zoomImagemPorRoda(event: WheelEvent) {
    ajustarZoomImagem(event.deltaY < 0 ? 0.2 : -0.2)
  }

  async function abrirImagemTelaCheia(identificador: string, nome = 'Imagem') {
    await garantirAnexoUrl(identificador)
    const url = anexosUrl.value[identificador]
    if (!url) return

    imagemTelaCheiaUrl.value = url
    imagemTelaCheiaNome.value = nome
    zoomImagemTelaCheia.value = 1
    imagemTelaCheiaAberta.value = true
  }

  function fecharImagemTelaCheia() {
    imagemTelaCheiaAberta.value = false
    zoomImagemTelaCheia.value = 1
  }

  function aoTeclaGlobal(event: KeyboardEvent) {
    if (!imagemTelaCheiaAberta.value) return
    if (event.key === 'Escape') { fecharImagemTelaCheia(); return }
    if (event.key === '+' || event.key === '=') { ajustarZoomImagem(0.2); return }
    if (event.key === '-') ajustarZoomImagem(-0.2)
  }

  function atualizarBloqueioScroll() {
    document.body.style.overflow = imagemTelaCheiaAberta.value ? 'hidden' : ''
  }

  watch(imagemTelaCheiaAberta, atualizarBloqueioScroll)

  onMounted(() => window.addEventListener('keydown', aoTeclaGlobal))
  onUnmounted(() => {
    window.removeEventListener('keydown', aoTeclaGlobal)
    document.body.style.overflow = ''
  })

  return {
    imagemTelaCheiaAberta,
    imagemTelaCheiaUrl,
    imagemTelaCheiaNome,
    zoomImagemTelaCheia,
    abrirImagemTelaCheia,
    fecharImagemTelaCheia,
    ajustarZoomImagem,
    zoomImagemPorRoda
  }
}
