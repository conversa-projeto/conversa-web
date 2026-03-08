import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Contato, Conversa, EventoChamadaSocket, Mensagem } from '../types/api'
import * as api from '../services/conversaApi'
import { useAuthStore } from './auth'
import { useCallStore } from './call'
import { playNotificationSound, showNotification, requestNotificationPermission } from '../utils/sound'

export const useChatStore = defineStore('chat', () => {
  const contatos = ref<Contato[]>([])
  const conversas = ref<Conversa[]>([])
  const mensagensPorConversa = ref<Record<number, Mensagem[]>>({})
  const conversaAtivaId = ref<number | null>(null)
  const resultadosBuscaConversa = ref<Mensagem[]>([])
  const carregando = ref(false)
  const conectadoTempoReal = ref(false)

  let polling: number | null = null
  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let reconnectAttempts = 0
  const marcandoVisualizacao = new Set<number>()

  let digitandoDebounceTimer: number | null = null
  let ultimoDigitandoEnviado = 0
  const DIGITANDO_DEBOUNCE_MS = 2500
  const DIGITANDO_EXPIRACAO_MS = 4000
  const digitandoPorConversa = ref<Map<number, Map<number, number>>>(new Map())

  let _tratarEventoChamada: ((evento: EventoChamadaSocket) => void) | null = null

  function registrarHandlerChamada(handler: (evento: EventoChamadaSocket) => void) {
    _tratarEventoChamada = handler
  }

  function removerHandlerChamada() {
    _tratarEventoChamada = null
  }

  const conversaAtiva = computed(() => conversas.value.find((item) => item.id === conversaAtivaId.value) || null)
  const mensagensAtivas = computed(() => {
    if (!conversaAtivaId.value) {
      return []
    }
    return mensagensPorConversa.value[conversaAtivaId.value] || []
  })

  const digitandoNaConversaAtiva = computed<string[]>(() => {
    if (!conversaAtivaId.value) return []
    const mapa = digitandoPorConversa.value.get(conversaAtivaId.value)
    if (!mapa || mapa.size === 0) return []
    const auth = useAuthStore()
    const nomes: string[] = []
    for (const usuarioId of mapa.keys()) {
      if (usuarioId === auth.user?.id) continue
      const contato = contatos.value.find(c => c.id === usuarioId)
      nomes.push(contato?.nome || `Usuário #${usuarioId}`)
    }
    return nomes
  })

  async function inicializar() {
    await Promise.all([carregarContatos(), carregarConversas()])
    if (!conversaAtivaId.value && conversas.value.length > 0) {
      await selecionarConversa(conversas.value[0].id)
    }
    conectarWebSocket()
    iniciarPolling()

    // Solicita permissão para notificações na inicialização
    void requestNotificationPermission()
  }

  async function carregarContatos() {
    contatos.value = await api.getContatos()
  }

  async function carregarConversas() {
    conversas.value = await api.getConversas()
  }

  async function selecionarConversa(conversaId: number) {
    conversaAtivaId.value = conversaId
    resultadosBuscaConversa.value = []
    await carregarMensagens(conversaId)
  }

  async function carregarMensagens(conversaId: number) {
    carregando.value = true
    try {
      const mensagens = await api.getMensagens(conversaId, 0, 80, 0)
      mensagensPorConversa.value[conversaId] = mensagens
    } finally {
      carregando.value = false
    }
  }

  async function atualizarConversaAtiva() {
    if (!conversaAtivaId.value) {
      return
    }
    await carregarMensagens(conversaAtivaId.value)
  }
  async function carregarMensagensAnteriores(conversaId: number, limite = 60) {
    const atuais = mensagensPorConversa.value[conversaId] || []
    if (atuais.length === 0) {
      await carregarMensagens(conversaId)
      return 0
    }

    const referencia = atuais[0]?.id || 0
    if (!referencia) return 0

    const anteriores = await api.getMensagens(conversaId, referencia, limite, 0)
    if (!anteriores.length) return 0

    const mapa = new Map<number, Mensagem>()
    for (const msg of anteriores) mapa.set(msg.id, msg)
    for (const msg of atuais) mapa.set(msg.id, msg)

    const merged = Array.from(mapa.values()).sort((a, b) => a.id - b.id)
    const antes = atuais.length
    mensagensPorConversa.value[conversaId] = merged
    return Math.max(0, merged.length - antes)
  }

  async function iniciarConversaDireta(contato: Contato) {
    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usuário não autenticado')
    }

    let conversa = conversas.value.find((item) => item.tipo === 1 && item.destinatario_id === contato.id)

    if (!conversa) {
      const criada = await api.createConversa('', 1)
      await api.addUsuarioConversa(criada.id, auth.user.id)
      await api.addUsuarioConversa(criada.id, contato.id)
      await carregarConversas()
      conversa = conversas.value.find((item) => item.id === criada.id)
      if (!conversa) {
        conversa = { ...criada, descricao: contato.nome, destinatario_id: contato.id }
      }
    }

    await selecionarConversa(conversa.id)
  }

  async function criarGrupo(nome: string, usuarioIds: number[]) {
    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usuário não autenticado')
    }

    const criada = await api.createConversa(nome, 2)
    const membros = Array.from(new Set([auth.user.id, ...usuarioIds]))

    for (const usuarioId of membros) {
      await api.addUsuarioConversa(criada.id, usuarioId)
    }

    await carregarConversas()
    await selecionarConversa(criada.id)
  }

  async function enviarTexto(texto: string) {
    if (!conversaAtivaId.value) {
      throw new Error('Nenhuma conversa ativa')
    }

    const auth = useAuthStore()
    const tempId = Date.now() * -1
    const conversaId = conversaAtivaId.value

    const optimisticMsg: Mensagem = {
      id: tempId,
      remetente_id: auth.user!.id,
      remetente: auth.user!.nome,
      conversa_id: conversaId,
      inserida: new Date().toISOString(),
      alterada: new Date().toISOString(),
      recebida: false,
      visualizada: false,
      reproduzida: false,
      enviando: true,
      conteudos: [
        {
          ordem: 1,
          tipo: 1,
          conteudo: texto
        }
      ]
    }

    if (!mensagensPorConversa.value[conversaId]) {
      mensagensPorConversa.value[conversaId] = []
    }
    mensagensPorConversa.value[conversaId] = [...mensagensPorConversa.value[conversaId], optimisticMsg]

    try {
      const resp = await api.enviarMensagem(conversaId, [
        {
          ordem: 1,
          tipo: 1,
          conteudo: texto
        }
      ])

      // Atualiza a mensagem otimista com os dados reais trocando o objeto para disparar reatividade
      const msgs = mensagensPorConversa.value[conversaId]
      const idx = msgs.findIndex(m => m.id === tempId)
      if (idx !== -1) {
        msgs[idx] = {
          ...msgs[idx],
          id: resp.id,
          enviando: false
        }
      }

      void carregarConversas()
    } catch (e) {
      // Remove a mensagem otimista em caso de erro
      mensagensPorConversa.value[conversaId] = mensagensPorConversa.value[conversaId].filter(m => m.id !== tempId)
      throw e
    }
  }

  async function enviarArquivo(blob: Blob, nomeArquivo: string, mimeType = '', isAudio = false) {
    if (!conversaAtivaId.value) {
      throw new Error('Nenhuma conversa ativa')
    }

    const auth = useAuthStore()
    const tempId = Date.now() * -1
    const conversaId = conversaAtivaId.value
    const extensao = (nomeArquivo.split('.').pop() || '').slice(0, 10)
    const tipo = isAudio ? 4 : mimeType.startsWith('image/') ? 2 : 3

    const localUrl = URL.createObjectURL(blob)
    const optimisticMsg: Mensagem = {
      id: tempId,
      remetente_id: auth.user!.id,
      remetente: auth.user!.nome,
      conversa_id: conversaId,
      inserida: new Date().toISOString(),
      alterada: new Date().toISOString(),
      recebida: false,
      visualizada: false,
      reproduzida: false,
      enviando: true,
      conteudos: [
        {
          ordem: 1,
          tipo,
          conteudo: nomeArquivo,
          nome: nomeArquivo,
          extensao,
          localUrl
        }
      ]
    }

    if (!mensagensPorConversa.value[conversaId]) {
      mensagensPorConversa.value[conversaId] = []
    }
    mensagensPorConversa.value[conversaId] = [...mensagensPorConversa.value[conversaId], optimisticMsg]

    try {
      const anexo = await api.uploadAnexo(tipo, nomeArquivo, extensao, blob)
      const resp = await api.enviarMensagem(conversaId, [
        {
          ordem: 1,
          tipo,
          conteudo: anexo.identificador
        }
      ])

      // Atualiza a mensagem otimista
      const msgs = mensagensPorConversa.value[conversaId]
      const idx = msgs.findIndex(m => m.id === tempId)
      if (idx !== -1) {
        msgs[idx] = {
          ...msgs[idx],
          id: resp.id,
          enviando: false,
          conteudos: [
            {
              ...msgs[idx].conteudos[0],
              conteudo: anexo.identificador,
              localUrl: undefined
            }
          ]
        }
      }

      // URL.revokeObjectURL(localUrl) // Opcional aqui, ou deixar para o componente se decidir

      void carregarConversas()
    } catch (e) {
      mensagensPorConversa.value[conversaId] = mensagensPorConversa.value[conversaId].filter(m => m.id !== tempId)
      URL.revokeObjectURL(localUrl)
      throw e
    }
  }

  
  async function carregarContextoMensagem(conversaId: number, mensagemId: number, previas = 30, seguintes = 30) {
    const atuais = mensagensPorConversa.value[conversaId] || []
    if (atuais.some(m => m.id === mensagemId)) {
      return true
    }

    let bloco = await api.getMensagens(conversaId, mensagemId, previas, seguintes)

    if (!bloco.some(m => m.id === mensagemId)) {
      // Fallback para uma janela maior, caso o backend limite o primeiro retorno.
      bloco = await api.getMensagens(conversaId, mensagemId, 120, 120)
    }

    if (!bloco.length) return false

    const mapa = new Map<number, Mensagem>()
    for (const msg of atuais) mapa.set(msg.id, msg)
    for (const msg of bloco) mapa.set(msg.id, msg)

    mensagensPorConversa.value[conversaId] = Array.from(mapa.values()).sort((a, b) => a.id - b.id)
    return mensagensPorConversa.value[conversaId].some(m => m.id === mensagemId)
  }
  async function buscarNaConversa(texto: string) {
    const auth = useAuthStore()
    if (!auth.user || !conversaAtivaId.value) {
      resultadosBuscaConversa.value = []
      return
    }

    const termo = texto.trim()
    if (!termo) {
      resultadosBuscaConversa.value = []
      return
    }

    const resultado = await api.pesquisarMensagens(auth.user.id, termo)
    resultadosBuscaConversa.value = resultado.filter((mensagem) => mensagem.conversa_id === conversaAtivaId.value)
  }

  async function marcarVisualizadas(conversaId: number, mensagens: Mensagem[]) {
    const auth = useAuthStore()
    const usuarioId = auth.user?.id
    if (!usuarioId) {
      return false
    }

    const pendentes = mensagens.filter((mensagem) => {
      return mensagem.remetente_id !== usuarioId && !mensagem.visualizada && !marcandoVisualizacao.has(mensagem.id)
    })

    if (pendentes.length === 0) {
      return false
    }

    for (const mensagem of pendentes) {
      marcandoVisualizacao.add(mensagem.id)
    }

    const resultados = await Promise.allSettled(
      pendentes.map((mensagem) => api.mensagemVisualizar(conversaId, mensagem.id))
    )

    for (let idx = 0; idx < pendentes.length; idx += 1) {
      const mensagem = pendentes[idx]
      marcandoVisualizacao.delete(mensagem.id)
      if (resultados[idx]?.status === 'fulfilled') {
        mensagem.visualizada = true
        mensagem.recebida = true
      }
    }

    return resultados.some((item) => item.status === 'fulfilled')
  }

  async function marcarMensagensComoVisualizadas(conversaId: number, mensagemIds: number[]) {
    if (mensagemIds.length === 0) {
      return false
    }

    const mensagens = mensagensPorConversa.value[conversaId] || []
    const alvo = mensagens.filter((mensagem) => mensagemIds.includes(mensagem.id))
    const alterou = await marcarVisualizadas(conversaId, alvo)
    if (alterou) {
      await carregarConversas()
    }
    return alterou
  }

  function getWebSocketUrl(): string {
    const isSecure = window.location.protocol === 'https:'
    const wsProtocol = isSecure ? 'wss:' : 'ws:'
    const httpPort = Number(window.location.port || (isSecure ? 443 : 80))
    const wsPort = 8000 + httpPort
    return `${wsProtocol}//${window.location.hostname}:${wsPort}`
  }

  function conectarWebSocket() {
    const auth = useAuthStore()
    if (!auth.token) {
      return
    }

    desconectarWebSocket(false)

    socket = new WebSocket(getWebSocketUrl())

    socket.onopen = () => {
      conectadoTempoReal.value = true
      reconnectAttempts = 0
      socket?.send(
        JSON.stringify({
          tipo: 1,
          token: auth.token
        })
      )
      if (_tratarEventoChamada) {
        const callStore = useCallStore()
        void callStore.verificarChamadasPendentes()
      }
    }

    socket.onmessage = (event) => {
      tratarEventoSocket(event.data)
    }

    socket.onerror = () => {
      conectadoTempoReal.value = false
    }

    socket.onclose = () => {
      conectadoTempoReal.value = false
      socket = null
      agendarReconexaoWebSocket()
    }
  }

  function desconectarWebSocket(resetTentativas = true) {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (socket) {
      socket.onclose = null
      socket.close()
      socket = null
    }
    conectadoTempoReal.value = false
    if (resetTentativas) {
      reconnectAttempts = 0
    }
  }

  function agendarReconexaoWebSocket() {
    if (reconnectTimer) {
      return
    }
    const delay = Math.min(30000, 1000 * 2 ** reconnectAttempts)
    reconnectAttempts += 1
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      conectarWebSocket()
    }, delay)
  }

  async function tratarEventoSocket(raw: string) {
    let evento: { tipo?: number; grupo?: number; conversa_id?: number; mensagens?: string; chamada_id?: number; usuario_id?: number } | null = null
    try {
      evento = JSON.parse(raw)
    } catch {
      return
    }

    if (!evento?.tipo) {
      return
    }

    if (evento.tipo === 2) {
      await tratarNovaMensagem()
      return
    }

    if (evento.tipo === 3) {
      const conversaId = evento.grupo || conversaAtivaId.value
      const mensagens = (evento.mensagens || '')
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0)

      if (conversaId && mensagens.length > 0) {
        await atualizarStatusMensagens(conversaId, mensagens)
      }

      await carregarConversas()

      if (conversaId && conversaAtivaId.value === conversaId && mensagens.length === 0) {
        await carregarMensagens(conversaId)
      }
      return
    }

    if (evento.tipo === 4 && evento.conversa_id && evento.usuario_id) {
      tratarDigitando(evento.conversa_id, evento.usuario_id)
      return
    }

    if (evento.tipo === 40) {
      await carregarConversas()
      return
    }

    if (evento.tipo && evento.tipo >= 51 && evento.tipo <= 55 && _tratarEventoChamada) {
      _tratarEventoChamada(evento as unknown as EventoChamadaSocket)
      return
    }
  }

  function getUltimaMensagemConhecida(): number {
    let ultima = 0

    for (const conversa of conversas.value) {
      ultima = Math.max(ultima, conversa.mensagem_id || 0)
    }

    for (const mensagens of Object.values(mensagensPorConversa.value)) {
      for (const mensagem of mensagens) {
        ultima = Math.max(ultima, mensagem.id)
      }
    }

    return ultima
  }

  async function tratarNovaMensagem() {
    const novas = await api.getMensagensNovas(getUltimaMensagemConhecida())
    if (novas.length === 0) {
      return
    }

    const auth = useAuthStore()
    const meuId = auth.user?.id
    const ativa = conversaAtivaId.value
    const conversaIdsRaw = Array.from(new Set(novas.map((item) => item.conversa_id)))

    // Busca os dados completos das novas mensagens para poder exibir notificações detalhadas
    const mensagensCompletas = await Promise.all(
      conversaIdsRaw.map(async (conversaId) => {
        const msgs = await api.getMensagens(conversaId, 0, 10, 0) // Busca as 10 últimas
        return msgs.filter((m) => novas.some((n) => n.mensagem_id === m.id))
      })
    )
    const todasNovasDetalhes = mensagensCompletas.flat()

    // Verifica se há novas mensagens de outros usuários que devem disparar notificação
    const deOutrosParaNotificar = todasNovasDetalhes.filter((m) => {
      const isMe = m.remetente_id === meuId
      const isChatAtivoEFocado = m.conversa_id === ativa && document.hasFocus()
      return !isMe && !isChatAtivoEFocado
    })

    if (deOutrosParaNotificar.length > 0) {
      // Toca o som de notificação
      playNotificationSound()

      // Mostra notificação para a última mensagem recebida que seja notificável
      const ultima = deOutrosParaNotificar[deOutrosParaNotificar.length - 1]
      const contato = contatos.value.find((c) => c.id === ultima.remetente_id)
      const nomeRemetente = contato?.nome || ultima.remetente || 'Nova mensagem'

      let texto = ''
      if (ultima.conteudos && ultima.conteudos.length > 0) {
        const c = ultima.conteudos[0]
        if (c.tipo === 1) texto = c.conteudo
        else if (c.tipo === 2) texto = '📷 Imagem'
        else if (c.tipo === 4) texto = '🎤 Áudio'
        else texto = '📎 Arquivo'
      }

      showNotification(nomeRemetente, {
        body: texto,
        tag: `conversa-${ultima.conversa_id}` // Agrupa notificações por conversa
      })
    }

    const conversaIds = conversaIdsRaw

    await Promise.allSettled(
      conversaIds
        .filter((conversaId) => conversaId !== ativa)
        .map((conversaId) => api.getMensagens(conversaId, 0, 1, 0))
    )

    await carregarConversas()

    if (!ativa) {
      return
    }

    const atualizada = conversaIds.includes(ativa)
    if (atualizada) {
      await carregarMensagens(ativa)
    }

    for (const conversaId of conversaIds) {
      const mapa = digitandoPorConversa.value.get(conversaId)
      if (mapa) {
        for (const timer of mapa.values()) window.clearTimeout(timer)
        digitandoPorConversa.value.delete(conversaId)
      }
    }
    if (conversaIds.length > 0) {
      digitandoPorConversa.value = new Map(digitandoPorConversa.value)
    }
  }

  async function atualizarStatusMensagens(conversaId: number, mensagemIds: number[]) {
    const status = await api.mensagemStatus(conversaId, mensagemIds)
    if (status.length === 0) {
      return
    }

    const mensagens = mensagensPorConversa.value[conversaId]
    if (!mensagens || mensagens.length === 0) {
      return
    }

    const statusMap = new Map(status.map((item) => [item.mensagem_id, item]))
    for (const mensagem of mensagens) {
      const item = statusMap.get(mensagem.id)
      if (!item) {
        continue
      }
      mensagem.recebida = item.recebida
      mensagem.visualizada = item.visualizada
      mensagem.reproduzida = item.reproduzida
    }
  }

  function iniciarPolling() {
    pararPolling()
    polling = window.setInterval(async () => {
      if (conectadoTempoReal.value) {
        return
      }
      await carregarConversas()
      if (conversaAtivaId.value) {
        await carregarMensagens(conversaAtivaId.value)
      }
      if (_tratarEventoChamada) {
        const callStore = useCallStore()
        void callStore.verificarChamadasPendentes()
      }
    }, 8000)
  }

  function pararPolling() {
    if (polling) {
      window.clearInterval(polling)
      polling = null
    }
  }



  function enviarDigitando() {
    if (!conversaAtivaId.value) return
    const agora = Date.now()
    if (agora - ultimoDigitandoEnviado < DIGITANDO_DEBOUNCE_MS) {
      if (!digitandoDebounceTimer) {
        digitandoDebounceTimer = window.setTimeout(() => {
          digitandoDebounceTimer = null
          enviarDigitando()
        }, DIGITANDO_DEBOUNCE_MS - (Date.now() - ultimoDigitandoEnviado))
      }
      return
    }
    ultimoDigitandoEnviado = agora
    void api.digitando(conversaAtivaId.value).catch(() => { })
  }

  function tratarDigitando(conversaId: number, usuarioId: number) {
    const auth = useAuthStore()
    if (usuarioId === auth.user?.id) return

    let mapa = digitandoPorConversa.value.get(conversaId)
    if (!mapa) {
      mapa = new Map()
      digitandoPorConversa.value.set(conversaId, mapa)
    }

    const timerExistente = mapa.get(usuarioId)
    if (timerExistente) window.clearTimeout(timerExistente)

    const timer = window.setTimeout(() => {
      const m = digitandoPorConversa.value.get(conversaId)
      if (m) {
        m.delete(usuarioId)
        if (m.size === 0) digitandoPorConversa.value.delete(conversaId)
        digitandoPorConversa.value = new Map(digitandoPorConversa.value)
      }
    }, DIGITANDO_EXPIRACAO_MS)

    mapa.set(usuarioId, timer)
    digitandoPorConversa.value = new Map(digitandoPorConversa.value)
  }

  function limparDigitandoConversaAtiva() {
    if (digitandoDebounceTimer) {
      window.clearTimeout(digitandoDebounceTimer)
      digitandoDebounceTimer = null
    }
    ultimoDigitandoEnviado = 0
  }

  function encerrarTempoReal() {
    pararPolling()
    desconectarWebSocket()
  }

  return {
    contatos,
    conversas,
    conversaAtiva,
    conversaAtivaId,
    mensagensAtivas,
    resultadosBuscaConversa,
    carregando,
    conectadoTempoReal,
    inicializar,
    carregarContatos,
    carregarConversas,
    selecionarConversa,
    carregarMensagensAnteriores,
    iniciarConversaDireta,
    criarGrupo,
    enviarTexto,
    enviarArquivo,
    buscarNaConversa,
    carregarContextoMensagem,
    iniciarPolling,
    pararPolling,
    conectarWebSocket,
    desconectarWebSocket,
    encerrarTempoReal,
    marcarMensagensComoVisualizadas,
    digitandoNaConversaAtiva,
    enviarDigitando,
    limparDigitandoConversaAtiva,
    registrarHandlerChamada,
    removerHandlerChamada
  }
})
