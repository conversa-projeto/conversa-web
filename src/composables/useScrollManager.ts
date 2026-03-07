import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'

export function useScrollManager() {
  const auth = useAuthStore()
  const chat = useChatStore()

  const mensagensContainer = ref<HTMLDivElement | null>(null)
  const usuarioNoFimDoChat = ref(true)
  const forcarScrollImagemAteFinal = ref(false)
  const posicionandoAberturaConversa = ref(false)
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

  function irParaMensagem(mensagemId: number) {
    const node = document.getElementById(`msg-${mensagemId}`)
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ; (node as HTMLElement).classList.add('ring-2', 'ring-amber-400')
    window.setTimeout(() => {
      ; (node as HTMLElement).classList.remove('ring-2', 'ring-amber-400')
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
      if (totalmenteVisivel) {
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
      const primeiraNaoLida = chat.mensagensAtivas.find((mensagem) => {
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
    () => chat.mensagensAtivas.map((mensagem) => mensagem.id),
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
  })

  return {
    mensagensContainer,
    usuarioNoFimDoChat,
    forcarScrollImagemAteFinal,
    posicionandoAberturaConversa,
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
