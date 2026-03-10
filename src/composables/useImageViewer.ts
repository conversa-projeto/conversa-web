import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'

export function useImageViewer(
  garantirAnexoUrl: (id: string) => Promise<void>,
  anexosUrl: Ref<Record<string, string>>
) {
  const imagemTelaCheiaAberta = ref(false)
  const imagemTelaCheiaUrl = ref('')
  const imagemTelaCheiaNome = ref('Imagem')
  const zoomImagemTelaCheia = ref(1)

  const translateX = ref(0)
  const translateY = ref(0)
  const isDragging = ref(false)
  const startMouseX = ref(0)
  const startMouseY = ref(0)

  function resetarZoom() {
    zoomImagemTelaCheia.value = 1
    translateX.value = 0
    translateY.value = 0
  }

  function ajustarZoomImagem(delta: number) {
    const zoomAntigo = zoomImagemTelaCheia.value
    const novoZoom = Math.min(5, Math.max(1, zoomAntigo + delta))
    zoomImagemTelaCheia.value = Number(novoZoom.toFixed(2))

    if (zoomImagemTelaCheia.value <= 1) {
      translateX.value = 0
      translateY.value = 0
    } else if (zoomAntigo > 1) {
      const proporcao = (zoomImagemTelaCheia.value - 1) / (zoomAntigo - 1)
      translateX.value *= proporcao
      translateY.value *= proporcao
    }
  }

  function zoomImagemPorRoda(event: WheelEvent) {
    ajustarZoomImagem(event.deltaY < 0 ? 0.2 : -0.2)
  }

  function iniciarArrasto(event: MouseEvent) {
    if (zoomImagemTelaCheia.value <= 1) return
    isDragging.value = true
    startMouseX.value = event.clientX - translateX.value
    startMouseY.value = event.clientY - translateY.value
  }

  function processarArrasto(event: MouseEvent) {
    if (!isDragging.value) return
    translateX.value = event.clientX - startMouseX.value
    translateY.value = event.clientY - startMouseY.value
  }

  function finalizarArrasto() {
    isDragging.value = false
  }

  async function abrirImagemTelaCheia(identificador: string, nome = 'Imagem') {
    await garantirAnexoUrl(identificador)
    const url = anexosUrl.value[identificador]
    if (!url) return

    imagemTelaCheiaUrl.value = url
    imagemTelaCheiaNome.value = nome
    resetarZoom()
    imagemTelaCheiaAberta.value = true
  }

  function fecharImagemTelaCheia() {
    imagemTelaCheiaAberta.value = false
    resetarZoom()
  }

  function aoTeclaGlobal(event: KeyboardEvent) {
    if (!imagemTelaCheiaAberta.value) return
    if (event.key === 'Escape') { fecharImagemTelaCheia(); return }
    if (event.key === '+' || event.key === '=') { ajustarZoomImagem(0.2); return }
    if (event.key === '-') ajustarZoomImagem(-0.2)
  }

  watch(imagemTelaCheiaAberta, (aberta) => {
    document.body.style.overflow = aberta ? 'hidden' : ''
  })

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
    translateX,
    translateY,
    isDragging,
    abrirImagemTelaCheia,
    fecharImagemTelaCheia,
    ajustarZoomImagem,
    zoomImagemPorRoda,
    iniciarArrasto,
    processarArrasto,
    finalizarArrasto
  }
}
