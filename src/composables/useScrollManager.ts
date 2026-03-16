import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import type { Mensagem } from '../types/api'

export function useScrollManager() {
  const auth = useAuthStore()
  const chat = useChatStore()

  const mensagensContainer = ref<HTMLDivElement | null>(null)
  const usuarioNoFimDoChat = ref(true)
  const forcarScrollImagemAteFinal = ref(false)
  const posicionandoAberturaConversa = ref(false)
  const carregandoHistorico = ref(false)
  let frameValidacaoVisualizacao = 0

  function rolarParaFinal() {
    if (!mensagensContainer.value) return
    mensagensContainer.value.scrollTop = mensagensContainer.value.scrollHeight
  }

  async function rolarParaFinalGarantido() {
    rolarParaFinal()
    await nextTick()
    rolarParaFinal()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    rolarParaFinal()
    await new Promise<void>((resolve) => setTimeout(resolve, 60))
    rolarParaFinal()
  }

  function rolarMensagemParaVisibilidadeCompleta(mensagemId: number) {
    const container = mensagensContainer.value
    const node = document.getElementById(`msg-${mensagemId}`)
    if (!container || !node) return

    const margem = 8
    const cRect = container.getBoundingClientRect()
    const mRect = node.getBoundingClientRect()

    if (mRect.height > container.clientHeight) {
      container.scrollTop += mRect.top - cRect.top - margem
      return
    }
    if (mRect.top < cRect.top + margem) {
      container.scrollTop += mRect.top - cRect.top - margem
      return
    }
    if (mRect.bottom > cRect.bottom - margem) {
      container.scrollTop += mRect.bottom - cRect.bottom + margem
    }
  }

  let highlightTimer = 0

  function irParaMensagem(mensagemId: number) {
    const node = document.getElementById(`msg-${mensagemId}`)
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    node.classList.add('ring-2', 'ring-amber-400')
    if (highlightTimer) window.clearTimeout(highlightTimer)
    highlightTimer = window.setTimeout(() => {
      node.classList.remove('ring-2', 'ring-amber-400')
      highlightTimer = 0
    }, 1200)
  }

  function atualizarPosicaoScroll() {
    if (!mensagensContainer.value) {
      usuarioNoFimDoChat.value = true
      return
    }
    const container = mensagensContainer.value
    const margem = 56
    usuarioNoFimDoChat.value =
      container.scrollTop + container.clientHeight >= container.scrollHeight - margem
  }

  function solicitarValidacaoVisualizacao() {
    if (frameValidacaoVisualizacao) {
      cancelAnimationFrame(frameValidacaoVisualizacao)
    }
    frameValidacaoVisualizacao = requestAnimationFrame(() => {
      frameValidacaoVisualizacao = 0
      void validarMensagensCompletamenteVisiveis()
    })
  }

  async function validarMensagensCompletamenteVisiveis() {
    const conversaId = chat.conversaAtivaId
    const usuarioId = auth.user?.id
    const container = mensagensContainer.value

    if (!conversaId || !usuarioId || !container) return

    const limite = container.getBoundingClientRect()
    const idsVisiveis: number[] = []

    for (const mensagem of chat.mensagensAtivas) {
      if (mensagem.remetente_id === usuarioId || mensagem.visualizada) continue

      const node = document.getElementById(`msg-${mensagem.id}`)
      if (!node) continue

      const box = node.getBoundingClientRect()
      const totalmenteVisivel = box.top >= limite.top && box.bottom <= limite.bottom
      const fimVisivel = box.bottom <= limite.bottom + 2 && box.bottom >= limite.top
      if (totalmenteVisivel || fimVisivel) {
        idsVisiveis.push(mensagem.id)
      }
    }

    if (idsVisiveis.length > 0) {
      await chat.marcarMensagensComoVisualizadas(conversaId, idsVisiveis)
    }
  }

  function aoScrollChat() {
    atualizarPosicaoScroll()
    solicitarValidacaoVisualizacao()
    void tentarCarregarMensagensAnteriores()
  }
  async function tentarCarregarMensagensAnteriores() {
    const conversaId = chat.conversaAtivaId
    const container = mensagensContainer.value
    if (!conversaId || !container) return
    if (carregandoHistorico.value || chat.carregando) return

    // Topo quase alcançado: busca página anterior.
    if (container.scrollTop > 40) return

    carregandoHistorico.value = true
    const alturaAntes = container.scrollHeight
    const topoAntes = container.scrollTop

    try {
      const adicionadas = await chat.carregarMensagensAnteriores(conversaId, 60)
      if (adicionadas > 0) {
        await nextTick()
        const alturaDepois = container.scrollHeight
        container.scrollTop = Math.max(0, alturaDepois - alturaAntes + topoAntes)
      }
    } finally {
      carregandoHistorico.value = false
    }
  }

  function aoCarregarImagemNoChat() {
    if (!forcarScrollImagemAteFinal.value && !usuarioNoFimDoChat.value) return

    void nextTick().then(() => {
      rolarParaFinal()
      atualizarPosicaoScroll()
      forcarScrollImagemAteFinal.value = false
    })
  }

  async function posicionarAberturaConversaAtiva() {
    if (!chat.conversaAtivaId || chat.mensagensAtivas.length === 0) return

    posicionandoAberturaConversa.value = true
    try {
      const usuarioId = auth.user?.id
      const primeiraNaoLida = chat.mensagensAtivas.find((mensagem: Mensagem) => {
        return mensagem.remetente_id !== usuarioId && !mensagem.visualizada
      })

      await nextTick()
      if (primeiraNaoLida) {
        rolarMensagemParaVisibilidadeCompleta(primeiraNaoLida.id)
      } else {
        await rolarParaFinalGarantido()
      }

      await nextTick()
      atualizarPosicaoScroll()
      solicitarValidacaoVisualizacao()
    } finally {
      posicionandoAberturaConversa.value = false
    }
  }

  // Auto-scroll on new messages
  watch(
    () => chat.mensagensAtivas.map((mensagem: Mensagem) => mensagem.id),
    async (atual, anterior) => {
      if (posicionandoAberturaConversa.value) return

      solicitarValidacaoVisualizacao()

      const estavaNoFim = usuarioNoFimDoChat.value
      const ultimoIdAnterior = anterior[anterior.length - 1] || 0
      const ultimoIdAtual = atual[atual.length - 1] || 0
      if (!ultimoIdAtual || ultimoIdAtual === ultimoIdAnterior) return

      const ultimaMensagem = chat.mensagensAtivas[chat.mensagensAtivas.length - 1]
      const isOwnMessage = !!ultimaMensagem && ultimaMensagem.remetente_id === auth.user?.id
      const recebidaDeOutroUsuario = !!ultimaMensagem && ultimaMensagem.remetente_id !== auth.user?.id
      if (!isOwnMessage && (!recebidaDeOutroUsuario || !estavaNoFim)) return

      await nextTick()
      rolarParaFinal()
      await nextTick()
      atualizarPosicaoScroll()
    }
  )

  onUnmounted(() => {
    if (frameValidacaoVisualizacao) {
      cancelAnimationFrame(frameValidacaoVisualizacao)
      frameValidacaoVisualizacao = 0
    }
    if (highlightTimer) {
      window.clearTimeout(highlightTimer)
      highlightTimer = 0
    }
  })

  return {
    mensagensContainer,
    usuarioNoFimDoChat,
    forcarScrollImagemAteFinal,
    posicionandoAberturaConversa,
    carregandoHistorico,
    rolarParaFinal,
    rolarParaFinalGarantido,
    rolarMensagemParaVisibilidadeCompleta,
    irParaMensagem,
    aoScrollChat,
    aoCarregarImagemNoChat,
    posicionarAberturaConversaAtiva,
    solicitarValidacaoVisualizacao
  }
}
