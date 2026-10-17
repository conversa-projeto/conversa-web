import { onBeforeUnmount, ref, type Ref } from 'vue'

// Seleção de mensagens no chat arrastando o mouse na área vazia ao lado das
// bolhas: desenha um retângulo e marca as mensagens que ele cruza (pela
// altura; a linha da mensagem ocupa a largura toda). Com Ctrl soma à seleção
// que já existe; Ctrl + clique numa mensagem soma ou tira só ela. Clicar no
// vazio sem arrastar limpa. Dentro da bolha o texto continua selecionável.

export interface FaixaMensagem {
  id: number
  topo: number
  base: number
}

// Mensagens cujas linhas cruzam a faixa vertical [de, ate] (em qualquer ordem)
export function idsNaFaixa(linhas: FaixaMensagem[], de: number, ate: number): number[] {
  const topo = Math.min(de, ate)
  const base = Math.max(de, ate)
  return linhas.filter((linha) => linha.base >= topo && linha.topo <= base).map((linha) => linha.id)
}

// Onde o arraste não começa: na bolha (texto, anexos, ações), em controles e
// na mensagem já selecionada (dali ela é arrastada para a pasta)
export const ALVOS_SEM_SELECAO = '[data-area-mensagem], [draggable="true"], button, a, input, textarea, select, [contenteditable="true"]'

const DISTANCIA_MINIMA = 4
const BORDA_ROLAGEM = 40

export function useSelecaoMensagens(
  container: Ref<HTMLElement | null>,
  opcoes: {
    ativa: () => boolean
    selecionadas: () => number[]
    definir: (ids: number[]) => void
    alternar: (id: number) => void
  },
) {
  // Retângulo na tela (position: fixed), recortado à área do chat
  const retangulo = ref<{ left: number; top: number; width: number; height: number } | null>(null)

  let inicio: { x: number; yConteudo: number } | null = null
  let ponteiro = { x: 0, y: 0 }
  let base: number[] = []
  let arrastou = false
  let quadro = 0

  function linhas(el: HTMLElement): FaixaMensagem[] {
    const caixa = el.getBoundingClientRect()
    return Array.from(el.querySelectorAll<HTMLElement>('[data-selecao-id]')).map((linha) => {
      const r = linha.getBoundingClientRect()
      return { id: Number(linha.dataset.selecaoId), topo: r.top - caixa.top + el.scrollTop, base: r.bottom - caixa.top + el.scrollTop }
    })
  }

  function atualizar() {
    const el = container.value
    if (!el || !inicio) return
    const caixa = el.getBoundingClientRect()
    const yAtual = Math.min(Math.max(ponteiro.y, caixa.top), caixa.bottom) - caixa.top + el.scrollTop
    const ids = idsNaFaixa(linhas(el), inicio.yConteudo, yAtual)
    opcoes.definir([...new Set([...base, ...ids])])

    const yInicioTela = inicio.yConteudo - el.scrollTop + caixa.top
    const topo = Math.max(Math.min(yInicioTela, ponteiro.y), caixa.top)
    const fim = Math.min(Math.max(yInicioTela, ponteiro.y), caixa.bottom)
    const esquerda = Math.max(Math.min(inicio.x, ponteiro.x), caixa.left)
    const direita = Math.min(Math.max(inicio.x, ponteiro.x), caixa.right)
    retangulo.value = { left: esquerda, top: topo, width: Math.max(0, direita - esquerda), height: Math.max(0, fim - topo) }
  }

  // Perto da borda de cima ou de baixo, o chat rola sozinho enquanto arrasta
  function rolarNaBorda() {
    quadro = 0
    const el = container.value
    if (!el || !inicio || !arrastou) return
    const caixa = el.getBoundingClientRect()
    let passo = 0
    if (ponteiro.y < caixa.top + BORDA_ROLAGEM) passo = -Math.ceil((caixa.top + BORDA_ROLAGEM - ponteiro.y) / 3)
    else if (ponteiro.y > caixa.bottom - BORDA_ROLAGEM) passo = Math.ceil((ponteiro.y - (caixa.bottom - BORDA_ROLAGEM)) / 3)
    if (passo) {
      el.scrollTop += passo
      atualizar()
    }
    quadro = requestAnimationFrame(rolarNaBorda)
  }

  function aoPressionar(evento: PointerEvent) {
    const el = container.value
    if (!el || !opcoes.ativa() || evento.button !== 0 || evento.pointerType === 'touch') return
    const alvo = evento.target as Element | null
    if (!alvo || alvo.closest(ALVOS_SEM_SELECAO)) return
    // Clique na barra de rolagem
    if (alvo === el && evento.offsetX >= el.clientWidth) return
    evento.preventDefault()
    const caixa = el.getBoundingClientRect()
    inicio = { x: evento.clientX, yConteudo: evento.clientY - caixa.top + el.scrollTop }
    ponteiro = { x: evento.clientX, y: evento.clientY }
    base = evento.ctrlKey || evento.metaKey ? opcoes.selecionadas() : []
    arrastou = false
    window.addEventListener('pointermove', aoMover)
    window.addEventListener('pointerup', aoSoltar)
    window.addEventListener('pointercancel', aoSoltar)
  }

  function aoMover(evento: PointerEvent) {
    if (!inicio) return
    ponteiro = { x: evento.clientX, y: evento.clientY }
    if (!arrastou) {
      const el = container.value
      const yInicioTela = el ? inicio.yConteudo - el.scrollTop + el.getBoundingClientRect().top : ponteiro.y
      if (Math.hypot(ponteiro.x - inicio.x, ponteiro.y - yInicioTela) < DISTANCIA_MINIMA) return
      arrastou = true
      quadro = requestAnimationFrame(rolarNaBorda)
    }
    atualizar()
  }

  function aoSoltar() {
    if (inicio && !arrastou && !base.length) opcoes.definir([])
    encerrar()
  }

  function encerrar() {
    inicio = null
    arrastou = false
    retangulo.value = null
    if (quadro) cancelAnimationFrame(quadro)
    quadro = 0
    window.removeEventListener('pointermove', aoMover)
    window.removeEventListener('pointerup', aoSoltar)
    window.removeEventListener('pointercancel', aoSoltar)
  }

  // Ctrl + clique numa mensagem: soma ou tira só ela (links e botões seguem normais)
  function aoClicar(evento: MouseEvent) {
    if (!opcoes.ativa() || !(evento.ctrlKey || evento.metaKey)) return
    const alvo = evento.target as Element | null
    if (!alvo || alvo.closest('a, button, input, textarea')) return
    const linha = alvo.closest<HTMLElement>('[data-selecao-id]')
    if (!linha) return
    evento.preventDefault()
    evento.stopPropagation()
    opcoes.alternar(Number(linha.dataset.selecaoId))
  }

  onBeforeUnmount(encerrar)

  return { retangulo, aoPressionar, aoClicar }
}
