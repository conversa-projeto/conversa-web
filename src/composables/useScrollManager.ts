import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import * as api from '../services/conversaApi'
import type { Mensagem } from '../types/api'

/**
 * Distância máxima (em px) do final do chat para que o auto-scroll aconteça
 * quando uma nova mensagem chega. Se o usuário estiver mais longe que isso,
 * o indicador "Há novas mensagens" aparece em vez de scrollar automaticamente.
 */
const LIMIAR_AUTO_SCROLL = 500

export function useScrollManager() {
  const auth = useAuthStore()
  const chat = useChatStore()

  // Ref do container de scroll (<div> com overflow-auto no MessageList.vue)
  const mensagensContainer = ref<HTMLDivElement | null>(null)

  // true quando o usuário está no final do chat (distância ≤ 56px).
  // Usado para decidir se imagens carregadas devem scrollar para o final.
  const usuarioNoFimDoChat = ref(true)

  // true quando o usuário está muito longe do final (> 1000px).
  // Usado para mostrar o botão de voltar ao final.
  const distanteDoFinal = ref(false)

  // true enquanto mensagens anteriores estão sendo carregadas via paginação.
  // Exibe um loading overlay no topo do chat.
  const carregandoHistorico = ref(false)

  // true quando há mensagens novas não visíveis (usuário está longe do final).
  // Exibe o botão flutuante "Há novas mensagens" acima da barra de input.
  const haNovasMensagens = ref(false)

  // Sinaliza para o MessageList que o indicador de não lidas está ativo,
  // permitindo que o auto-scroll verifique se scrollar empurraria o indicador
  // para fora da viewport.
  const indicadorNaoLidasAtivo = ref(false)

  let frameValidacaoVisualizacao = 0
  let highlightTimer = 0

  // =====================================================================
  // FUNÇÕES DE SCROLL
  // =====================================================================

  /** Scroll instantâneo para o final do chat */
  function rolarParaFinal() {
    if (!mensagensContainer.value) return
    mensagensContainer.value.scrollTop = mensagensContainer.value.scrollHeight
  }

  /**
   * Scroll animado para o final com easing.
   * Se há um gap (não estamos nas mensagens mais recentes), recarrega
   * as mensagens mais recentes e posiciona no final instantaneamente.
   */
  async function rolarParaFinalAnimado() {
    if (!semMaisSeguintes) {
      const conversaId = chat.conversaAtivaId
      if (!conversaId) return
      await chat.recarregarMensagensRecentes(conversaId)
      semMaisSeguintes = true
      await nextTick()
      rolarParaFinal()
      return
    }

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

  /**
   * Scroll para o final com garantia: executa duas vezes (antes e depois do nextTick)
   * para cobrir casos onde o DOM ainda não refletiu a última mudança.
   */
  async function rolarParaFinalGarantido() {
    rolarParaFinal()
    await nextTick()
    rolarParaFinal()
  }

  /**
   * Scroll suave até uma mensagem específica, com destaque visual temporário.
   * Usado para navegar até uma mensagem referenciada (resposta, busca, etc).
   * Se a mensagem não estiver no DOM, carrega o contexto dela via API.
   */
  async function irParaMensagem(mensagemId: number) {
    let node = document.getElementById(`msg-${mensagemId}`)
    let carregouContexto = false

    if (!node) {
      const conversaId = chat.conversaAtivaId
      if (!conversaId) return
      const ok = await chat.carregarContextoMensagem(conversaId, mensagemId, 30, 30)
      if (!ok) return
      ativarPaginacaoBidirecional()
      await nextTick()
      await nextTick()
      node = document.getElementById(`msg-${mensagemId}`)
      if (!node) return
      carregouContexto = true
    }

    // Quando o contexto foi carregado remotamente, o array inteiro foi substituído —
    // usar 'instant' para evitar erro de posição causado por layout instável (imagens carregando).
    node.scrollIntoView({ behavior: carregouContexto ? 'instant' : 'smooth', block: 'center' })

    // Re-scroll após layout estabilizar (imagens podem alterar alturas)
    if (carregouContexto) {
      const msgId = mensagemId
      await new Promise(r => setTimeout(r, 150))
      const reNode = document.getElementById(`msg-${msgId}`)
      if (reNode) reNode.scrollIntoView({ behavior: 'instant', block: 'center' })
    }

    node.classList.add('ring-2', 'ring-amber-400')
    if (highlightTimer) window.clearTimeout(highlightTimer)
    highlightTimer = window.setTimeout(() => {
      node!.classList.remove('ring-2', 'ring-amber-400')
      highlightTimer = 0
    }, 1200)
  }

  // =====================================================================
  // POSIÇÃO DO SCROLL
  // =====================================================================

  /** Calcula a distância em px entre a posição atual e o final do container */
  function obterDistanciaDoFinal(): number {
    if (!mensagensContainer.value) return Infinity
    const c = mensagensContainer.value
    return c.scrollHeight - c.scrollTop - c.clientHeight
  }

  /**
   * Atualiza os refs de posição do scroll.
   * Chamado em cada evento de scroll e após posicionamentos programáticos.
   * Também limpa o indicador "Há novas mensagens" quando o usuário scrola
   * para perto do final (≤ LIMIAR_AUTO_SCROLL).
   */
  function atualizarPosicaoScroll() {
    const distancia = obterDistanciaDoFinal()
    usuarioNoFimDoChat.value = distancia <= 56
    distanteDoFinal.value = distancia > 1000
    if (distancia <= LIMIAR_AUTO_SCROLL) {
      haNovasMensagens.value = false
    }
  }

  // =====================================================================
  // VISUALIZAÇÃO DE MENSAGENS
  // =====================================================================

  /**
   * Agenda a validação de mensagens visíveis via requestAnimationFrame.
   * Garante que a validação roda no máximo uma vez por frame,
   * evitando overhead durante scroll rápido.
   */
  function solicitarValidacaoVisualizacao() {
    if (frameValidacaoVisualizacao) {
      cancelAnimationFrame(frameValidacaoVisualizacao)
    }
    frameValidacaoVisualizacao = requestAnimationFrame(() => {
      frameValidacaoVisualizacao = 0
      void validarMensagensCompletamenteVisiveis()
    })
  }

  /**
   * Percorre as mensagens do outro remetente que ainda não foram visualizadas
   * e verifica se estão completamente visíveis no viewport do container.
   * Se estiverem, envia a marcação de visualização para o servidor.
   * Só executa quando a janela do navegador está focada.
   */
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

  // =====================================================================
  // HANDLER DE SCROLL
  // =====================================================================

  /**
   * Handler do evento @scroll do container de mensagens.
   * Responsável por:
   * 1. Atualizar refs de posição (usuarioNoFimDoChat, distanteDoFinal)
   * 2. Agendar validação de mensagens visíveis (para marcar como lidas)
   * 3. Disparar paginação (prefetch + injeção de mensagens anteriores)
   */
  function aoScrollChat() {
    atualizarPosicaoScroll()
    solicitarValidacaoVisualizacao()
    void tentarCarregarMensagensAnteriores()
    void tentarCarregarMensagensSeguintes()
  }

  // =====================================================================
  // PAGINAÇÃO (CARREGAMENTO DE MENSAGENS ANTERIORES)
  //
  // Estratégia em duas fases para carregamento suave:
  //
  // Fase 1 - PREFETCH (antecipação):
  //   Quando o usuário chega a 1.5x a altura visível do topo, dispara uma
  //   requisição à API e armazena a Promise sem tocar no store reativo.
  //   Isso não causa nenhuma mudança visual — é apenas rede.
  //
  // Fase 2 - INJEÇÃO:
  //   Quando o usuário chega de fato no topo (scrollTop ≤ 2px), aguarda
  //   a Promise do prefetch (geralmente já resolvida) e injeta as mensagens
  //   no store. O scroll é compensado com scrollHeight antes/depois para
  //   manter a posição visual.
  //
  // Proteções:
  //   - semMaisHistorico: para de buscar quando a API retorna array vazio
  //   - injetando: impede injeções concorrentes
  //   - prefetchConversaId: descarta prefetch de conversa diferente
  //   - Limiar proporcional (1.5x clientHeight) funciona em qualquer tela
  // =====================================================================

  let prefetchPromise: Promise<Mensagem[]> | null = null
  let prefetchConversaId: number | null = null
  let prefetchBuscando = false
  let semMaisHistorico = false

  // Estado de paginação para BAIXO (mensagens seguintes).
  // semMaisSeguintes começa true — em modo normal já estamos nas mensagens mais recentes.
  // Ao navegar para uma mensagem via busca, ativarPaginacaoBidirecional() seta para false.
  let prefetchSeguintesPromise: Promise<Mensagem[]> | null = null
  let prefetchSeguintesConversaId: number | null = null
  let prefetchSeguintesBuscando = false
  let semMaisSeguintes = true

  /**
   * Inicia a busca de mensagens anteriores na API sem injetar no store.
   * A Promise é armazenada em prefetchPromise para uso posterior.
   * Usa o ID da primeira mensagem carregada como referência para a API.
   */
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

  /**
   * Orquestra o prefetch e a injeção de mensagens anteriores.
   * Chamado em cada evento de scroll pelo aoScrollChat.
   *
   * Comportamento:
   * - A ≤ 1.5x da altura visível do topo: inicia prefetch (apenas API, sem DOM)
   * - A scrollTop ≤ 2px (topo): aguarda prefetch e injeta no store
   * - Após injeção: compensa scrollTop para manter a posição visual
   *   (scrollTop = scrollHeight novo - scrollHeight antes da injeção)
   */
  async function tentarCarregarMensagensAnteriores() {
    const conversaId = chat.conversaAtivaId
    const container = mensagensContainer.value
    if (!conversaId || !container) return
    if (chat.carregando) return

    // Fase 1: Prefetch antecipado — dispara quando falta 1.5x a altura visível para o topo.
    // Usa proporção da tela para funcionar corretamente em qualquer resolução.
    const limiarPrefetch = container.clientHeight * 1.5
    if (container.scrollTop <= limiarPrefetch && !prefetchPromise && !prefetchBuscando) {
      iniciarPrefetch()
    }

    // Fase 2: Injeção — só quando o usuário chegou de fato no topo.
    // Threshold de 2px para cobrir subpixel rendering.
    if (container.scrollTop > 2) return
    if (injetando) return

    // Se não tem prefetch para esta conversa (mudou de conversa ou nunca iniciou), iniciar agora
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
        // API retornou vazio — não há mais mensagens anteriores nesta conversa.
        // Parar de tentar para evitar requisições infinitas.
        semMaisHistorico = true
        return
      }

      // Merge com deduplicação: Map garante que mensagens com mesmo ID não duplicam.
      // Sort por ID mantém a ordem cronológica.
      const atuais = chat.mensagensAtivas
      const mapa = new Map<number, Mensagem>()
      for (const msg of anteriores) mapa.set(msg.id, msg)
      for (const msg of atuais) mapa.set(msg.id, msg)
      const merged = Array.from(mapa.values()).sort((a, b) => a.id - b.id)
      const adicionadas = merged.length - atuais.length

      if (adicionadas > 0) {
        // Capturar scrollHeight ANTES de injetar — após a injeção + nextTick,
        // a diferença de scrollHeight corresponde à altura do conteúdo novo.
        // Somar essa diferença ao scrollTop mantém a posição visual estável.
        const alturaAntes = container.scrollHeight
        // Atualizar ultimoIdConhecido ANTES de definir mensagens para evitar que
        // o watch interprete mensagens paginadas como "novas"
        ultimoIdConhecido = merged[merged.length - 1].id
        chat.definirMensagens(conversaId, merged)
        await nextTick()
        container.scrollTop = container.scrollHeight - alturaAntes
      }
    } finally {
      carregandoHistorico.value = false
      injetando = false
    }
  }

  // =====================================================================
  // PAGINAÇÃO PARA BAIXO (MENSAGENS SEGUINTES)
  //
  // Espelho da paginação para cima. Ativado quando o usuário navega para
  // uma mensagem via busca e scrola para baixo além das mensagens carregadas.
  // Usa o mesmo padrão de prefetch + injeção em duas fases.
  // =====================================================================

  /**
   * Ativa a paginação para baixo. Chamado externamente após navegar
   * para uma mensagem via busca (carregarContextoMensagem).
   */
  /**
   * Ativa a paginação bidirecional. Chamado externamente após navegar
   * para uma mensagem via busca (carregarContextoMensagem).
   * Reseta ambas as direções para permitir carregamento para cima e para baixo.
   */
  function ativarPaginacaoBidirecional() {
    semMaisSeguintes = false
    prefetchSeguintesPromise = null
    prefetchSeguintesConversaId = null
    prefetchSeguintesBuscando = false
    semMaisHistorico = false
    prefetchPromise = null
    prefetchConversaId = null
    prefetchBuscando = false
  }

  /**
   * Inicia a busca de mensagens seguintes na API sem injetar no store.
   * Usa o ID da última mensagem carregada como referência.
   */
  function iniciarPrefetchSeguintes() {
    const conversaId = chat.conversaAtivaId
    if (!conversaId) return
    if (prefetchSeguintesBuscando || prefetchSeguintesPromise || semMaisSeguintes) return

    const atuais = chat.mensagensAtivas
    if (atuais.length === 0) return

    const referencia = atuais[atuais.length - 1]?.id || 0
    if (!referencia) return

    prefetchSeguintesBuscando = true
    prefetchSeguintesConversaId = conversaId
    prefetchSeguintesPromise = api.getMensagens(conversaId, referencia, 0, 60)
      .then(msgs => {
        prefetchSeguintesBuscando = false
        return msgs
      })
      .catch(() => {
        prefetchSeguintesBuscando = false
        prefetchSeguintesPromise = null
        prefetchSeguintesConversaId = null
        return []
      })
  }

  let injetandoSeguintes = false

  // Ref para indicar carregamento de mensagens seguintes no final do chat
  const carregandoSeguintes = ref(false)

  /**
   * Orquestra o prefetch e a injeção de mensagens seguintes.
   * Chamado em cada evento de scroll pelo aoScrollChat.
   *
   * - A ≤ 1.5x da altura visível do final: inicia prefetch
   * - A distância ≤ 2px do final: aguarda prefetch e injeta no store
   */
  async function tentarCarregarMensagensSeguintes() {
    const conversaId = chat.conversaAtivaId
    const container = mensagensContainer.value
    if (!conversaId || !container) return
    if (chat.carregando) return
    if (semMaisSeguintes) return

    const distanciaDoFinal = obterDistanciaDoFinal()

    // Fase 1: Prefetch antecipado
    const limiarPrefetch = container.clientHeight * 1.5
    if (distanciaDoFinal <= limiarPrefetch && !prefetchSeguintesPromise && !prefetchSeguintesBuscando) {
      iniciarPrefetchSeguintes()
    }

    // Fase 2: Injeção — só quando o usuário chegou de fato no final
    if (distanciaDoFinal > 2) return
    if (injetandoSeguintes) return

    if (!prefetchSeguintesPromise || prefetchSeguintesConversaId !== conversaId) {
      prefetchSeguintesPromise = null
      prefetchSeguintesConversaId = null
      iniciarPrefetchSeguintes()
    }

    if (!prefetchSeguintesPromise) return

    injetandoSeguintes = true
    carregandoSeguintes.value = true

    try {
      const seguintes = await prefetchSeguintesPromise
      prefetchSeguintesPromise = null
      prefetchSeguintesConversaId = null

      if (!seguintes.length) {
        semMaisSeguintes = true
        return
      }

      const atuais = chat.mensagensAtivas
      const mapa = new Map<number, Mensagem>()
      for (const msg of atuais) mapa.set(msg.id, msg)
      for (const msg of seguintes) mapa.set(msg.id, msg)
      const merged = Array.from(mapa.values()).sort((a, b) => a.id - b.id)
      const adicionadas = merged.length - atuais.length

      if (adicionadas > 0) {
        // Atualizar ultimoIdConhecido ANTES de definir mensagens para evitar que
        // o watch interprete as mensagens injetadas como "novas" e cause auto-scroll
        ultimoIdConhecido = merged[merged.length - 1].id
        chat.definirMensagens(conversaId, merged)
        await nextTick()
      } else {
        // API retornou apenas mensagens já conhecidas — chegamos ao final
        semMaisSeguintes = true
      }
    } finally {
      carregandoSeguintes.value = false
      injetandoSeguintes = false
    }
  }

  // =====================================================================
  // IMAGEM CARREGADA
  // =====================================================================

  /**
   * Chamado quando uma imagem dentro do chat termina de carregar (evento @load).
   * Se o usuário estava no final do chat, rola para o final para compensar
   * a mudança de altura causada pela imagem. Caso contrário, não interfere.
   */
  function aoCarregarImagemNoChat() {
    if (!usuarioNoFimDoChat.value) return

    void nextTick().then(() => {
      rolarParaFinal()
      atualizarPosicaoScroll()
    })
  }

  // =====================================================================
  // ABERTURA DE CONVERSA
  //
  // Chamado pelo MessageList após a conversa ser selecionada e mensagens
  // carregadas. Responsável por posicionar o scroll na posição correta:
  //
  // - Com mensagens não lidas: posiciona a primeira não lida no topo
  //   da viewport (com margem de 40px para o indicador visual).
  // - Sem mensagens não lidas E nunca posicionou: scroll para o final.
  // - Sem mensagens não lidas E já posicionou: só scroll se o usuário
  //   ainda estiver perto do final (≤ LIMIAR_AUTO_SCROLL). Isso respeita
  //   a posição do usuário caso ele tenha scrollado para cima durante o
  //   carregamento da API.
  //
  // Após posicionar, grava ultimoIdConhecido para que o watch de mensagens
  // não trate mensagens existentes como novas (prevenindo auto-scroll
  // indesejado que puxaria o usuário de volta para baixo).
  // =====================================================================

  async function posicionarAberturaConversaAtiva(): Promise<number | null> {
    if (!chat.conversaAtivaId || chat.mensagensAtivas.length === 0) return null

    haNovasMensagens.value = false
    await nextTick()

    const container = mensagensContainer.value
    const usuarioId = auth.user?.id
    const primeiraNaoLida = chat.mensagensAtivas.find((mensagem: Mensagem) => {
      return mensagem.remetente_id !== usuarioId && !mensagem.visualizada
    })

    if (primeiraNaoLida) {
      // Posicionar a primeira não lida no topo da viewport com margem para o indicador
      const node = document.getElementById(`msg-${primeiraNaoLida.id}`)
      if (node && container) {
        const cRect = container.getBoundingClientRect()
        const mRect = node.getBoundingClientRect()
        container.scrollTop += mRect.top - cRect.top - 40
      } else {
        await rolarParaFinalGarantido()
      }
    } else if (!jaPositionouConversa || obterDistanciaDoFinal() <= LIMIAR_AUTO_SCROLL) {
      // Sem não lidas: scrollar para o final apenas se:
      // - O scroll nunca foi posicionado nesta conversa (primeira abertura sem cache), ou
      // - O usuário ainda está perto do final (não scrollou para cima intencionalmente)
      await rolarParaFinalGarantido()
    }

    jaPositionouConversa = true

    // Gravar o último ID conhecido — o watch de mensagens só fará auto-scroll
    // para mensagens com ID MAIOR que este valor. Isso impede que mudanças
    // de IDs causadas pela substituição do cache pela resposta da API
    // sejam interpretadas como "novas mensagens" e puxem o scroll para baixo.
    const msgs = chat.mensagensAtivas
    if (msgs.length > 0) {
      ultimoIdConhecido = msgs[msgs.length - 1].id
    }

    await nextTick()
    atualizarPosicaoScroll()
    solicitarValidacaoVisualizacao()

    return primeiraNaoLida?.id ?? null
  }

  // =====================================================================
  // WATCHES
  // =====================================================================

  /**
   * ID da última mensagem conhecida no momento do posicionamento.
   * O watch de mensagens só reage a IDs maiores que este valor.
   *
   * Ao trocar de conversa, é definido como MAX_SAFE_INTEGER para bloquear
   * qualquer auto-scroll até que posicionarAberturaConversaAtiva defina
   * o valor real. Isso previne que mudanças de IDs durante a transição
   * (cache → API, ou conversa A → conversa B) sejam tratadas como
   * "mensagens novas" e causem scroll indesejado.
   */
  let ultimoIdConhecido = 0

  /**
   * Flag que indica se o scroll já foi posicionado pelo menos uma vez
   * nesta conversa. Usado para distinguir entre:
   * - "scroll nunca foi feito" (deve forçar scroll para o final)
   * - "scroll foi feito e usuário scrollou para cima" (deve respeitar)
   *
   * Sem este flag, a verificação de distância falha na primeira abertura
   * (sem cache) porque a distância é grande mas não por scroll do usuário.
   */
  let jaPositionouConversa = false

  /**
   * Watch de troca de conversa.
   *
   * Ao trocar de conversa:
   * 1. Reseta todos os estados (indicadores, prefetch, flags)
   * 2. Bloqueia auto-scroll (ultimoIdConhecido = MAX_SAFE_INTEGER)
   * 3. No próximo tick, tenta scrollar para o final — funciona quando há
   *    mensagens em cache da conversa. Se não houver cache (array vazio),
   *    o scroll não tem efeito e o watch de carregando cobre esse caso.
   */
  watch(() => chat.conversaAtivaId, () => {
    haNovasMensagens.value = false
    ultimoIdConhecido = Number.MAX_SAFE_INTEGER
    jaPositionouConversa = false
    prefetchPromise = null
    prefetchConversaId = null
    prefetchBuscando = false
    semMaisHistorico = false
    prefetchSeguintesPromise = null
    prefetchSeguintesConversaId = null
    prefetchSeguintesBuscando = false
    semMaisSeguintes = true

    // Scroll imediato para o final (cobre mensagens do cache).
    // Executa via nextTick para que o DOM já reflita a nova conversa.
    // Se conseguiu chegar no final (distância ≤ 56px), marca como posicionado.
    void nextTick().then(() => {
      rolarParaFinal()
      // Só marcar como posicionado se há mensagens renderizadas.
      // Container vazio (sem cache) tem distância 0 mas não é um posicionamento real —
      // marcar como true aqui impediria o scroll posterior quando a API retornar mensagens.
      if (obterDistanciaDoFinal() <= 56 && chat.mensagensAtivas.length > 0) jaPositionouConversa = true
    })
  })

  /**
   * Watch de carregamento.
   *
   * Quando a API termina de carregar mensagens (carregando: true → false):
   * - Se o scroll nunca foi posicionado (jaPositionouConversa = false):
   *   scroll para o final. Cobre a primeira abertura sem cache.
   * - Se já foi posicionado mas o usuário está perto do final:
   *   scroll para o final (API pode ter retornado mensagens mais recentes).
   * - Se o usuário scrollou para cima: não interfere.
   *
   * Este watch complementa o watch de conversaAtivaId: juntos cobrem
   * abertura com cache (conversaAtivaId) e sem cache (carregando).
   */
  watch(() => chat.carregando, (carregando, anteriorCarregando) => {
    if (!carregando && anteriorCarregando && chat.conversaAtivaId) {
      void nextTick().then(() => {
        if (!jaPositionouConversa || obterDistanciaDoFinal() <= LIMIAR_AUTO_SCROLL) {
          // Se o indicador de não lidas está visível, verificar se scrollar
          // o empurraria para fora da viewport. Se sim, não scrollar.
          if (indicadorNaoLidasAtivo.value && jaPositionouConversa) {
            const container = mensagensContainer.value
            const indicador = document.getElementById('indicador-nao-lidas')
            if (container && indicador) {
              const containerRect = container.getBoundingClientRect()
              const novoScrollTop = container.scrollHeight - container.clientHeight
              const deslocamento = novoScrollTop - container.scrollTop
              const indicadorTop = indicador.getBoundingClientRect().top - deslocamento
              if (indicadorTop < containerRect.top) {
                return
              }
            }
          }
          rolarParaFinal()
          jaPositionouConversa = true
        }
      })
    }
  })

  /**
   * Watch de novas mensagens em tempo real.
   *
   * Observa mudanças nos IDs das mensagens ativas. Só reage quando:
   * 1. Havia mensagens antes (anterior.length > 0) — ignora carregamento inicial
   * 2. O último ID é MAIOR que ultimoIdConhecido — ignora substituições de cache
   *    pela API e mudanças de conversa. Só reage a mensagens genuinamente novas
   *    (chegaram via WebSocket/polling após a conversa ter sido posicionada).
   *
   * Comportamento quando detecta nova mensagem:
   * - Mensagem própria: sempre auto-scroll para o final
   * - Mensagem alheia + perto do final (≤ 500px): auto-scroll,
   *   EXCETO se o indicador de não lidas ficaria fora da viewport
   * - Mensagem alheia + longe do final (> 500px): mostra indicador
   *   "Há novas mensagens" sem interferir no scroll
   */
  watch(
    () => chat.mensagensAtivas.map((mensagem: Mensagem) => mensagem.id),
    async (atual, anterior) => {
      solicitarValidacaoVisualizacao()

      // Ignorar carregamento inicial (primeira vez que mensagens aparecem)
      if (!anterior || anterior.length === 0) return

      const ultimoAtual = atual[atual.length - 1] || 0

      // Só reagir a mensagens genuinamente novas — IDs maiores que o último conhecido.
      // Quando ultimoIdConhecido é MAX_SAFE_INTEGER (transição de conversa),
      // nenhuma mudança passa por esta verificação até posicionarAberturaConversaAtiva
      // definir o valor real.
      if (!ultimoAtual || ultimoAtual <= ultimoIdConhecido) return
      ultimoIdConhecido = ultimoAtual

      const ultimaMensagem = chat.mensagensAtivas[chat.mensagensAtivas.length - 1]
      const eMinha = !!ultimaMensagem && ultimaMensagem.remetente_id === auth.user?.id
      const distancia = obterDistanciaDoFinal()

      if (eMinha || distancia <= LIMIAR_AUTO_SCROLL) {
        await nextTick()

        // Se o indicador de não lidas está visível, verificar se scrollar para o final
        // o empurraria para fora da viewport. Se sim, não scrollar — manter o indicador
        // visível é mais importante que mostrar a última mensagem.
        if (indicadorNaoLidasAtivo.value && !eMinha) {
          const container = mensagensContainer.value
          const indicador = document.getElementById('indicador-nao-lidas')
          if (container && indicador) {
            const containerRect = container.getBoundingClientRect()
            const novoScrollTop = container.scrollHeight - container.clientHeight
            const deslocamento = novoScrollTop - container.scrollTop
            const indicadorTop = indicador.getBoundingClientRect().top - deslocamento
            if (indicadorTop < containerRect.top) {
              return
            }
          }
        }

        rolarParaFinal()
        await nextTick()
        atualizarPosicaoScroll()
      } else {
        // Usuário está longe do final — não scrollar, mostrar indicador flutuante
        haNovasMensagens.value = true
      }
    }
  )

  /**
   * Auto-scroll quando uma reação é adicionada/removida na última mensagem.
   * Só faz scroll se o usuário já estiver no final do chat (≤ 56px).
   */
  watch(
    () => {
      const msgs = chat.mensagensAtivas
      if (!msgs.length) return 0
      const ultima = msgs[msgs.length - 1]
      return (ultima.reacoes || []).reduce((acc: number, r: { quantidade: number }) => acc + r.quantidade, 0)
    },
    async () => {
      if (!usuarioNoFimDoChat.value) return
      await nextTick()
      rolarParaFinal()
    }
  )

  // =====================================================================
  // LIFECYCLE
  // =====================================================================

  /** Ao focar a janela, validar mensagens visíveis para marcar como lidas */
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

  // =====================================================================
  // API PÚBLICA
  // =====================================================================

  return {
    mensagensContainer,
    usuarioNoFimDoChat,
    distanteDoFinal,
    carregandoHistorico,
    carregandoSeguintes,
    haNovasMensagens,
    indicadorNaoLidasAtivo,
    rolarParaFinal,
    rolarParaFinalAnimado,
    irParaMensagem,
    aoScrollChat,
    aoCarregarImagemNoChat,
    posicionarAberturaConversaAtiva,
    solicitarValidacaoVisualizacao,
    ativarPaginacaoBidirecional
  }
}
