import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import * as api from '../services/conversaApi'
import type { Mensagem } from '../types/api'

const LIMIAR_AUTO_SCROLL = 500

export function useScrollManager() {
  const auth = useAuthStore()
  const chat = useChatStore()

  const mensagensContainer = ref<HTMLDivElement | null>(null)
  const usuarioNoFimDoChat = ref(true)
  const distanteDoFinal = ref(false)
  const carregandoHistorico = ref(false)
  const haNovasMensagens = ref(false)
  const indicadorNaoLidasAtivo = ref(false)
  let frameValidacaoVisualizacao = 0
  let highlightTimer = 0

  // --- Funções de scroll ---

  function rolarParaFinal() {
    if (!mensagensContainer.value) return
    mensagensContainer.value.scrollTop = mensagensContainer.value.scrollHeight
  }

  function rolarParaFinalAnimado() {
    const container = mensagensContainer.value
    if (!container) return
    const inicio = container.scrollTop
    const destino = container.scrollHeight - container.clientHeight
    const distancia = destino - inicio
    if (distancia <= 0) return
    const duracao = Math.min(600, Math.max(300, distancia * 0.3))
    let inicioTempo = 0

    function easeInOutQuart(t: number) {
      return t < 0.3 ? 8 * t * t * t : 1 - Math.pow(1 - t, 4)
    }

    function animar(timestamp: number) {
      if (!inicioTempo) inicioTempo = timestamp
      const progresso = Math.min((timestamp - inicioTempo) / duracao, 1)
      container!.scrollTop = inicio + distancia * easeInOutQuart(progresso)
      if (progresso < 1) {
        requestAnimationFrame(animar)
      }
    }

    requestAnimationFrame(animar)
  }

  async function rolarParaFinalGarantido() {
    rolarParaFinal()
    await nextTick()
    rolarParaFinal()
  }

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

  // --- Posição do scroll ---

  function obterDistanciaDoFinal(): number {
    if (!mensagensContainer.value) return 0
    const c = mensagensContainer.value
    return c.scrollHeight - c.scrollTop - c.clientHeight
  }

  function atualizarPosicaoScroll() {
    const distancia = obterDistanciaDoFinal()
    usuarioNoFimDoChat.value = distancia <= 56
    distanteDoFinal.value = distancia > 1000
    // Limpar indicador de novas mensagens quando próximo do final
    if (distancia <= LIMIAR_AUTO_SCROLL) {
      haNovasMensagens.value = false
    }
  }

  // --- Visualização de mensagens ---

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
    if (!document.hasFocus()) return

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

  // --- Handler de scroll ---

  function aoScrollChat() {
    atualizarPosicaoScroll()
    solicitarValidacaoVisualizacao()
    void tentarCarregarMensagensAnteriores()
  }

  // --- Paginação ---

  // Prefetch: busca da API quando perto do topo, injeta no store só quando chegar no topo
  let prefetchPromise: Promise<Mensagem[]> | null = null
  let prefetchConversaId: number | null = null
  let prefetchBuscando = false
  let semMaisHistorico = false

  function iniciarPrefetch() {
    const conversaId = chat.conversaAtivaId
    if (!conversaId) return
    if (prefetchBuscando || prefetchPromise || semMaisHistorico) return

    const atuais = chat.mensagensAtivas
    if (atuais.length === 0) return

    const referencia = atuais[0]?.id || 0
    if (!referencia) return

    prefetchBuscando = true
    prefetchConversaId = conversaId
    prefetchPromise = api.getMensagens(conversaId, referencia, 60, 0)
      .then(msgs => {
        prefetchBuscando = false
        return msgs
      })
      .catch(() => {
        prefetchBuscando = false
        prefetchPromise = null
        prefetchConversaId = null
        return []
      })
  }

  let injetando = false

  async function tentarCarregarMensagensAnteriores() {
    const conversaId = chat.conversaAtivaId
    const container = mensagensContainer.value
    if (!conversaId || !container) return
    if (chat.carregando) return

    // Quando falta 1.5x a altura visível para chegar no topo: iniciar prefetch
    const limiarPrefetch = container.clientHeight * 1.5
    if (container.scrollTop <= limiarPrefetch && !prefetchPromise && !prefetchBuscando) {
      iniciarPrefetch()
    }

    // Só injeta quando chegar no topo (threshold para subpixel)
    if (container.scrollTop > 2) return
    if (injetando) return

    // Se não tem prefetch para esta conversa, iniciar agora
    if (!prefetchPromise || prefetchConversaId !== conversaId) {
      prefetchPromise = null
      prefetchConversaId = null
      iniciarPrefetch()
    }

    if (!prefetchPromise) return

    injetando = true
    carregandoHistorico.value = true

    try {
      const anteriores = await prefetchPromise
      prefetchPromise = null
      prefetchConversaId = null

      if (!anteriores.length) {
        semMaisHistorico = true
        return
      }

      // Injetar no store
      const atuais = chat.mensagensAtivas
      const mapa = new Map<number, Mensagem>()
      for (const msg of anteriores) mapa.set(msg.id, msg)
      for (const msg of atuais) mapa.set(msg.id, msg)
      const merged = Array.from(mapa.values()).sort((a, b) => a.id - b.id)
      const adicionadas = merged.length - atuais.length

      if (adicionadas > 0) {
        const alturaAntes = container.scrollHeight
        chat.definirMensagens(conversaId, merged)
        await nextTick()
        container.scrollTop = container.scrollHeight - alturaAntes
      }
    } finally {
      carregandoHistorico.value = false
      injetando = false
    }
  }

  // --- Imagem carregada ---

  function aoCarregarImagemNoChat() {
    if (!usuarioNoFimDoChat.value) return

    void nextTick().then(() => {
      rolarParaFinal()
      atualizarPosicaoScroll()
    })
  }

  // --- Abertura de conversa ---

  async function posicionarAberturaConversaAtiva(): Promise<number | null> {
    if (!chat.conversaAtivaId || chat.mensagensAtivas.length === 0) return null

    haNovasMensagens.value = false
    await nextTick()

    const usuarioId = auth.user?.id
    const primeiraNaoLida = chat.mensagensAtivas.find((mensagem: Mensagem) => {
      return mensagem.remetente_id !== usuarioId && !mensagem.visualizada
    })

    if (primeiraNaoLida) {
      // Scrollar para que a primeira não lida fique no topo da viewport
      const node = document.getElementById(`msg-${primeiraNaoLida.id}`)
      const container = mensagensContainer.value
      if (node && container) {
        const cRect = container.getBoundingClientRect()
        const mRect = node.getBoundingClientRect()
        // Posicionar a mensagem no topo do container com margem para o indicador
        container.scrollTop += mRect.top - cRect.top - 40
      } else {
        await rolarParaFinalGarantido()
      }
    } else {
      await rolarParaFinalGarantido()
    }

    await nextTick()
    atualizarPosicaoScroll()
    solicitarValidacaoVisualizacao()

    return primeiraNaoLida?.id ?? null
  }

  // --- Watches ---

  // Auto-scroll em novas mensagens (apenas em tempo real, não no carregamento)
  let conversaCarregada: number | null = null

  // Resetar ao trocar de conversa
  watch(() => chat.conversaAtivaId, () => {
    haNovasMensagens.value = false
    conversaCarregada = null
    prefetchPromise = null
    prefetchConversaId = null
    prefetchBuscando = false
    semMaisHistorico = false
  })

  watch(() => chat.carregando, (carregando, anteriorCarregando) => {
    // Marcar a conversa como "recém-carregada" para ignorar a primeira mudança de mensagens
    if (!carregando && anteriorCarregando) {
      conversaCarregada = chat.conversaAtivaId
      // Limpar após 500ms caso o watch de IDs não dispare (cache = API)
      setTimeout(() => {
        if (conversaCarregada === chat.conversaAtivaId) {
          conversaCarregada = null
        }
      }, 500)
    }
  })

  watch(
    () => chat.mensagensAtivas.map((mensagem: Mensagem) => mensagem.id),
    async (atual, anterior) => {
      solicitarValidacaoVisualizacao()

      // Ignorar carregamento inicial
      if (!anterior || anterior.length === 0) return

      // Ignorar a mudança que ocorre quando carregarMensagens substitui o cache
      if (conversaCarregada === chat.conversaAtivaId) {
        conversaCarregada = null
        return
      }

      const ultimoAnterior = anterior[anterior.length - 1] || 0
      const ultimoAtual = atual[atual.length - 1] || 0
      if (!ultimoAtual || ultimoAtual === ultimoAnterior) return

      const ultimaMensagem = chat.mensagensAtivas[chat.mensagensAtivas.length - 1]
      const eMinha = !!ultimaMensagem && ultimaMensagem.remetente_id === auth.user?.id
      const distancia = obterDistanciaDoFinal()

      if (eMinha || distancia <= LIMIAR_AUTO_SCROLL) {
        await nextTick()

        // Se o indicador de não lidas está visível, verificar se scrollar para o final
        // o empurraria para fora da viewport — se sim, não scrollar
        if (indicadorNaoLidasAtivo.value && !eMinha) {
          const container = mensagensContainer.value
          const indicador = document.getElementById('indicador-nao-lidas')
          if (container && indicador) {
            const containerRect = container.getBoundingClientRect()
            const novoScrollTop = container.scrollHeight - container.clientHeight
            const deslocamento = novoScrollTop - container.scrollTop
            const indicadorTop = indicador.getBoundingClientRect().top - deslocamento
            if (indicadorTop < containerRect.top) {
              // Indicador sairia da tela — não scrollar
              return
            }
          }
        }

        rolarParaFinal()
        await nextTick()
        atualizarPosicaoScroll()
      } else {
        haNovasMensagens.value = true
      }
    }
  )

  // --- Lifecycle ---

  function aoFocarJanela() {
    solicitarValidacaoVisualizacao()
  }

  onMounted(() => {
    window.addEventListener('focus', aoFocarJanela)
  })

  onUnmounted(() => {
    window.removeEventListener('focus', aoFocarJanela)
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
    distanteDoFinal,
    carregandoHistorico,
    haNovasMensagens,
    indicadorNaoLidasAtivo,
    rolarParaFinal,
    rolarParaFinalAnimado,
    irParaMensagem,
    aoScrollChat,
    aoCarregarImagemNoChat,
    posicionarAberturaConversaAtiva,
    solicitarValidacaoVisualizacao
  }
}
