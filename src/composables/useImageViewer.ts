import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { copiarImagem } from '../utils/copiarImagem'
import { isVideoConteudo } from '../utils/formatters'
import { TipoConteudo, type Mensagem } from '../types/api'

// Item do visualizador: imagem ou vídeo (que toca no mesmo visualizador)
export interface ItemGaleria {
  identificador: string
  nome: string
  legenda?: string
  video?: boolean
}

// Imagens e vídeos das mensagens, na ordem da conversa, com o texto enviado
// junto (mostrado no visualizador)
export function galeriaDasMensagens(mensagens: Mensagem[]): ItemGaleria[] {
  const itens: ItemGaleria[] = []
  for (const mensagem of mensagens) {
    // Excluída não entra: o conteúdo dela só aparece clicando na mensagem
    if (mensagem.excluida_em) continue
    const legenda = mensagem.conteudos
      .filter((c) => c.tipo === TipoConteudo.Texto)
      .map((c) => c.conteudo.trim())
      .filter(Boolean)
      .join('\n')
    for (const conteudo of mensagem.conteudos) {
      if (conteudo.tipo === TipoConteudo.Imagem) {
        itens.push({ identificador: conteudo.conteudo, nome: conteudo.nome || 'Imagem', legenda })
      } else if (conteudo.tipo === TipoConteudo.Arquivo && isVideoConteudo(conteudo)) {
        itens.push({ identificador: conteudo.conteudo, nome: conteudo.nome || 'Vídeo', legenda, video: true })
      }
    }
  }
  return itens
}

export function useImageViewer(
  garantirAnexoUrl: (id: string) => Promise<void>,
  anexosUrl: Ref<Record<string, string>>,
  galeriaRef?: Ref<ItemGaleria[]>
) {
  const imagemTelaCheiaAberta = ref(false)
  const imagemTelaCheiaUrl = ref('')
  const imagemTelaCheiaNome = ref('Imagem')
  const imagemAtualIdentificador = ref('')
  const zoomImagemTelaCheia = ref(1)

  const translateX = ref(0)
  const translateY = ref(0)
  const isDragging = ref(false)
  const startMouseX = ref(0)
  const startMouseY = ref(0)

  const transicaoAtiva = ref(false)
  let transicaoTimer = 0

  // Galeria alternativa — quando definida, substitui galeriaRef (ex.: fila de envio)
  const galeriaOverride = ref<ItemGaleria[] | null>(null)

  // Vídeo aberto: sem zoom e sem copiar (o player tem os próprios controles)
  function atualEhVideo() {
    const galeria = galeriaOverride.value ?? galeriaRef?.value ?? []
    return !!galeria.find((i) => i.identificador === imagemAtualIdentificador.value)?.video
  }

  function resetarZoom() {
    zoomImagemTelaCheia.value = 1
    translateX.value = 0
    translateY.value = 0
  }

  function resetarZoomComTransicao() {
    transicaoAtiva.value = true
    zoomImagemTelaCheia.value = 1
    translateX.value = 0
    translateY.value = 0
    if (transicaoTimer) window.clearTimeout(transicaoTimer)
    transicaoTimer = window.setTimeout(() => {
      transicaoAtiva.value = false
      transicaoTimer = 0
    }, 300)
  }

  function calcularPassoZoom(zoomAtual: number): number {
    if (zoomAtual < 1) return 0.1
    if (zoomAtual < 3) return 0.2
    if (zoomAtual < 8) return 0.5
    return 1
  }

  function ajustarZoomImagem(direcao: number) {
    const zoomAntigo = zoomImagemTelaCheia.value
    const passo = calcularPassoZoom(zoomAntigo)
    const delta = direcao > 0 ? passo : -passo
    const novoZoom = Math.min(30, Math.max(0.1, zoomAntigo + delta))
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
    ajustarZoomImagem(event.deltaY < 0 ? 1 : -1)
  }

  function iniciarArrasto(event: MouseEvent) {
    if (zoomImagemTelaCheia.value === 1) return
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
    imagemAtualIdentificador.value = identificador
    resetarZoom()
    imagemTelaCheiaAberta.value = true
  }

  function fecharImagemTelaCheia() {
    imagemTelaCheiaAberta.value = false
    imagemAtualIdentificador.value = ''
    galeriaOverride.value = null
    resetarZoom()
  }

  function abrirImagemDireta(
    url: string,
    nome: string,
    identificador: string,
    galeria: ItemGaleria[]
  ) {
    galeriaOverride.value = galeria
    imagemTelaCheiaUrl.value = url
    imagemTelaCheiaNome.value = nome
    imagemAtualIdentificador.value = identificador
    resetarZoom()
    imagemTelaCheiaAberta.value = true
  }

  async function copiarImagemParaClipboard() {
    if (!imagemTelaCheiaUrl.value) return
    try {
      await copiarImagem(imagemTelaCheiaUrl.value)
    } catch {
      // Silently fail if clipboard API not available
    }
  }

  async function navegarGaleria(direcao: -1 | 1) {
    const galeria = galeriaOverride.value ?? galeriaRef?.value
    if (!galeria || galeria.length < 2) return
    const idx = galeria.findIndex(i => i.identificador === imagemAtualIdentificador.value)
    if (idx === -1) return
    const proximo = idx + direcao
    if (proximo < 0 || proximo >= galeria.length) return
    const item = galeria[proximo]
    if (!item) return
    await abrirImagemTelaCheia(item.identificador, item.nome)
  }

  function aoTeclaGlobal(event: KeyboardEvent) {
    if (!imagemTelaCheiaAberta.value) return
    if (event.key === 'Escape') { fecharImagemTelaCheia(); return }
    // Com o player do vídeo em foco, as setas avançam e voltam o vídeo
    if (event.target instanceof HTMLMediaElement) return
    if (event.key === 'ArrowLeft') { void navegarGaleria(-1); return }
    if (event.key === 'ArrowRight') { void navegarGaleria(1); return }
    if (atualEhVideo()) return
    if (event.key === '+' || event.key === '=') { ajustarZoomImagem(1); return }
    if (event.key === '-') { ajustarZoomImagem(-1); return }
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      event.preventDefault()
      void copiarImagemParaClipboard()
    }
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
    imagemAtualIdentificador,
    zoomImagemTelaCheia,
    translateX,
    translateY,
    isDragging,
    abrirImagemTelaCheia,
    abrirImagemDireta,
    fecharImagemTelaCheia,
    ajustarZoomImagem,
    zoomImagemPorRoda,
    iniciarArrasto,
    processarArrasto,
    finalizarArrasto,
    resetarZoom,
    resetarZoomComTransicao,
    transicaoAtiva,
    copiarImagemParaClipboard,
    galeriaOverride
  }
}
