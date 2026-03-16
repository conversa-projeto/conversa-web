import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { TipoConversa, TipoConteudo, TipoEventoSocket, TipoMensagemReferencia } from '../types/api'
import type { Contato, ConteudoMensagem, Conversa, EventoChamadaSocket, EventoSocket, Mensagem } from '../types/api'
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

  const mensagemRespondendo = ref<Mensagem | null>(null)
  const usuariosConversa = ref<Record<number, Array<{ id: number; usuario_id: number; nome: string }>>>({})

  let digitandoDebounceTimer: number | null = null
  let ultimoDigitandoEnviado = 0
  const DIGITANDO_DEBOUNCE_MS = 2500
  const DIGITANDO_EXPIRACAO_MS = 4000
  const digitandoPorConversa = ref<Map<number, Map<number, number>>>(new Map())

  const GRAVANDO_DEBOUNCE_MS = 2500
  const GRAVANDO_EXPIRACAO_MS = 4000
  let gravandoDebounceTimer: number | null = null
  let ultimoGravandoEnviado = 0
  const gravandoPorConversa = ref<Map<number, Map<number, number>>>(new Map())

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

  const gravandoNaConversaAtiva = computed<string[]>(() => {
    if (!conversaAtivaId.value) return []
    const mapa = gravandoPorConversa.value.get(conversaAtivaId.value)
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

  const usuariosConversaAtiva = computed(() => {
    if (!conversaAtivaId.value) return []
    return usuariosConversa.value[conversaAtivaId.value] || []
  })

  async function carregarUsuariosConversa(conversaId: number, forcar = false) {
    if (!forcar && usuariosConversa.value[conversaId]) return
    try {
      usuariosConversa.value[conversaId] = await api.getUsuariosConversa(conversaId)
    } catch {
      // silencia erro - não é crítico
    }
  }

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

  async function obterOuCriarConversaDireta(contato: Contato) {
    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usu??rio n??o autenticado')
    }

    let conversa = conversas.value.find((item) => item.tipo === TipoConversa.Direta && item.destinatario_id === contato.id)

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

    return conversa
  }

  async function iniciarConversaDireta(contato: Contato) {
    const conversa = await obterOuCriarConversaDireta(contato)
    await selecionarConversa(conversa.id)
  }

  async function criarGrupo(nome: string, usuarioIds: number[]) {
    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usu??rio n??o autenticado')
    }

    const criada = await api.createConversa(nome, TipoConversa.Grupo)
    const membros = Array.from(new Set([auth.user.id, ...usuarioIds]))

    await Promise.all(membros.map(usuarioId => api.addUsuarioConversa(criada.id, usuarioId)))

    await carregarConversas()
    await selecionarConversa(criada.id)
  }

  async function renomearGrupo(conversaId: number, descricao: string) {
    await api.atualizarConversa(conversaId, { descricao })
    await carregarConversas()
  }

  type ConteudoArquivoEntrada = {
    blob: Blob
    nomeArquivo: string
    mimeType?: string
    isAudio?: boolean
    isGravacaoAudio?: boolean
  }

  function responderMensagem(msg: Mensagem) {
    mensagemRespondendo.value = msg
  }

  function cancelarResposta() {
    mensagemRespondendo.value = null
  }

  function criarMensagemReferenciaResumo(origem: Mensagem, tipo: TipoMensagemReferencia) {
    return {
      tipo,
      origem_mensagem_id: origem.id,
      mensagem: {
        id: origem.id,
        conversa_id: origem.conversa_id,
        remetente: origem.remetente,
        conteudos: origem.conteudos
      }
    }
  }

  function clonarConteudosParaEnvio(conteudos: ConteudoMensagem[]) {
    return conteudos
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((conteudo, index) => ({
        ordem: index + 1,
        tipo: conteudo.tipo,
        conteudo: conteudo.conteudo
      }))
  }

  async function encaminharMensagemParaConversa(origem: Mensagem, conversaDestinoId: number) {
    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usu??rio n??o autenticado')
    }

    const conteudos = clonarConteudosParaEnvio(origem.conteudos)
    if (conteudos.length === 0) {
      throw new Error('A mensagem selecionada nao possui conteudo para encaminhar.')
    }

    await api.enviarMensagem(conversaDestinoId, conteudos, {
      tipo: TipoMensagemReferencia.Encaminhada,
      origem_mensagem_id: origem.id
    })

    await carregarConversas()
    await selecionarConversa(conversaDestinoId)
  }

  async function encaminharMensagemParaContato(origem: Mensagem, contato: Contato) {
    const conversa = await obterOuCriarConversaDireta(contato)
    await encaminharMensagemParaConversa(origem, conversa.id)
  }

  async function enviarMensagemComConteudos(texto: string, arquivos: ConteudoArquivoEntrada[] = []) {

    if (!conversaAtivaId.value) {
      throw new Error('Nenhuma conversa ativa')
    }

    const textoLimpo = texto.trim()
    if (!textoLimpo && arquivos.length === 0) {
      return
    }

    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usuário não autenticado')
    }
    const conversaId = conversaAtivaId.value
    const tempId = Date.now() * -1

    let ordem = 1
    const conteudosOptimistas: Mensagem['conteudos'] = []
    const conteudosApi: Array<{ ordem: number; tipo: TipoConteudo; conteudo: string }> = []
    const localUrlsParaLimpar: string[] = []

    if (textoLimpo) {
      conteudosOptimistas.push({
        ordem,
        tipo: TipoConteudo.Texto,
        conteudo: textoLimpo
      })
      conteudosApi.push({
        ordem,
        tipo: TipoConteudo.Texto,
        conteudo: textoLimpo
      })
      ordem += 1
    }

    const arquivosInfo: Array<{ blob: Blob; nomeArquivo: string; extensao: string; tipo: TipoConteudo; ordem: number }> = []

    for (const arq of arquivos) {
      const mimeType = arq.mimeType || ''
      const nomeArquivo = arq.nomeArquivo
      const extensao = (nomeArquivo.split('.').pop() || '').slice(0, 10)
      const tipo = arq.isGravacaoAudio ? TipoConteudo.GravacaoAudio : arq.isAudio ? TipoConteudo.Audio : mimeType.startsWith('image/') ? TipoConteudo.Imagem : TipoConteudo.Arquivo
      const localUrl = URL.createObjectURL(arq.blob)
      localUrlsParaLimpar.push(localUrl)

      conteudosOptimistas.push({
        ordem,
        tipo,
        conteudo: nomeArquivo,
        nome: nomeArquivo,
        extensao,
        localUrl
      })

      arquivosInfo.push({ blob: arq.blob, nomeArquivo, extensao, tipo, ordem })
      ordem += 1
    }

    // Captura referencia antes de limpar
    const respostaMsg = mensagemRespondendo.value
    const mensagemReferencia = respostaMsg?.id && respostaMsg.id > 0
      ? { tipo: TipoMensagemReferencia.Resposta, origem_mensagem_id: respostaMsg.id }
      : undefined
    mensagemRespondendo.value = null

    // Adiciona mensagem otimista ? UI imediatamente (antes dos uploads)
    const optimisticMsg: Mensagem = {
      id: tempId,
      remetente_id: auth.user.id,
      remetente: auth.user.nome,
      conversa_id: conversaId,
      inserida: new Date().toISOString(),
      alterada: new Date().toISOString(),
      recebida: false,
      visualizada: false,
      reproduzida: false,
      enviando: true,
      conteudos: conteudosOptimistas,
      ...(mensagemReferencia && respostaMsg ? {
        mensagem_referencia: criarMensagemReferenciaResumo(respostaMsg, TipoMensagemReferencia.Resposta),
      } : {})
    }

    if (!mensagensPorConversa.value[conversaId]) {
      mensagensPorConversa.value[conversaId] = []
    }
    mensagensPorConversa.value[conversaId] = [...mensagensPorConversa.value[conversaId], optimisticMsg]

    try {
      // Faz uploads após a mensagem já estar visível
      for (const arq of arquivosInfo) {
        const anexo = await api.uploadAnexo(arq.tipo, arq.nomeArquivo, arq.extensao, arq.blob)
        conteudosApi.push({
          ordem: arq.ordem,
          tipo: arq.tipo,
          conteudo: anexo.identificador
        })
      }

      const resp = await api.enviarMensagem(conversaId, conteudosApi, mensagemReferencia)

      const conteudosFinais = conteudosOptimistas.map((conteudo) => {
        if (conteudo.tipo === TipoConteudo.Texto) {
          return conteudo
        }
        const correspondente = conteudosApi.find((c) => c.ordem === conteudo.ordem)
        return {
          ...conteudo,
          conteudo: correspondente?.conteudo || conteudo.conteudo,
          localUrl: undefined
        }
      })

      const msgs = mensagensPorConversa.value[conversaId]
      const idx = msgs.findIndex(m => m.id === tempId)
      if (idx !== -1) {
        msgs[idx] = {
          ...msgs[idx],
          id: resp.id,
          enviando: false,
          conteudos: conteudosFinais
        }
      }

      for (const url of localUrlsParaLimpar) {
        URL.revokeObjectURL(url)
      }

      void carregarConversas()
    } catch (e) {
      mensagensPorConversa.value[conversaId] = mensagensPorConversa.value[conversaId].filter(m => m.id !== tempId)
      for (const url of localUrlsParaLimpar) {
        URL.revokeObjectURL(url)
      }
      throw e
    }
  }

  async function enviarTexto(texto: string) {
    await enviarMensagemComConteudos(texto, [])
  }

  async function enviarArquivo(blob: Blob, nomeArquivo: string, mimeType = '', isAudio = false) {
    await enviarMensagemComConteudos('', [{ blob, nomeArquivo, mimeType, isAudio }])
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

  async function marcarVisualizadas(conversaId: number, mensagens: Mensagem[]): Promise<number> {
    const auth = useAuthStore()
    const usuarioId = auth.user?.id
    if (!usuarioId) {
      return 0
    }

    const pendentes = mensagens.filter((mensagem) => {
      return mensagem.id > 0 && !mensagem.enviando && mensagem.remetente_id !== usuarioId && !mensagem.visualizada && !marcandoVisualizacao.has(mensagem.id)
    })

    if (pendentes.length === 0) {
      return 0
    }

    for (const mensagem of pendentes) {
      marcandoVisualizacao.add(mensagem.id)
    }

    const resultados = await Promise.allSettled(
      pendentes.map((mensagem) => api.mensagemVisualizar(conversaId, mensagem.id))
    )

    let marcadas = 0
    for (let idx = 0; idx < pendentes.length; idx += 1) {
      const mensagem = pendentes[idx]
      marcandoVisualizacao.delete(mensagem.id)
      if (resultados[idx]?.status === 'fulfilled') {
        mensagem.visualizada = true
        mensagem.recebida = true
        marcadas++
      }
    }

    return marcadas
  }

  async function marcarMensagensComoVisualizadas(conversaId: number, mensagemIds: number[]) {
    if (mensagemIds.length === 0) {
      return false
    }

    const mensagens = mensagensPorConversa.value[conversaId] || []
    const alvo = mensagens.filter((mensagem) => mensagemIds.includes(mensagem.id))
    const marcadas = await marcarVisualizadas(conversaId, alvo)
    if (marcadas > 0) {
      // Atualiza o contador otimisticamente para feedback imediato na sidebar
      const conversa = conversas.value.find(c => c.id === conversaId)
      if (conversa) {
        conversa.mensagens_sem_visualizar = Math.max(0, (conversa.mensagens_sem_visualizar || 0) - marcadas)
      }
      void carregarConversas()
    }
    return marcadas > 0
  }

  function getWebSocketUrl(): string {
    const isSecure = window.location.protocol === 'https:'
    const wsProtocol = isSecure ? 'wss:' : 'ws:'
    const wsPort = import.meta.env.VITE_WS_PORT
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
    let evento: EventoSocket | null = null
    try {
      evento = JSON.parse(raw)
    } catch {
      return
    }

    if (!evento?.tipo) {
      return
    }

    if (evento.tipo === TipoEventoSocket.NovaMensagem) {
      await tratarNovaMensagem()
      return
    }

    if (evento.tipo === TipoEventoSocket.StatusMensagem) {
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

    if (evento.tipo === TipoEventoSocket.Digitando && evento.conversa_id && evento.usuario_id) {
      tratarDigitando(evento.conversa_id, evento.usuario_id)
      return
    }

    if (evento.tipo === TipoEventoSocket.GravandoAudio && evento.conversa_id && evento.usuario_id) {
      tratarGravando(evento.conversa_id, evento.usuario_id)
      return
    }

    if (evento.tipo === TipoEventoSocket.ConversaAtualizada) {
      await carregarConversas()
      return
    }

    if (evento.tipo && evento.tipo >= TipoEventoSocket.ChamadaRecebida && evento.tipo <= TipoEventoSocket.VideoAtivado && _tratarEventoChamada) {
      _tratarEventoChamada(evento as EventoChamadaSocket)
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
        if (c.tipo === TipoConteudo.Texto) texto = c.conteudo
        else if (c.tipo === TipoConteudo.Imagem) texto = 'Imagem'
        else if (c.tipo === TipoConteudo.GravacaoAudio) texto = 'Gravacao de audio'
        else if (c.tipo === TipoConteudo.Audio) texto = 'Audio'
        else texto = 'Arquivo'
      }

      showNotification(nomeRemetente, {
        body: texto,
        tag: `conversa-${ultima.conversa_id}` // Agrupa notificações por conversa
      })
    }

    await carregarConversas()

    if (!ativa) {
      return
    }

    const atualizada = conversaIdsRaw.includes(ativa)
    if (atualizada) {
      await carregarMensagens(ativa)
    }

    for (const conversaId of conversaIdsRaw) {
      const mapa = digitandoPorConversa.value.get(conversaId)
      if (mapa) {
        for (const timer of mapa.values()) window.clearTimeout(timer)
        digitandoPorConversa.value.delete(conversaId)
      }
    }
    if (conversaIdsRaw.length > 0) {
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

  function enviarGravando() {
    if (!conversaAtivaId.value) return
    const agora = Date.now()
    if (agora - ultimoGravandoEnviado < GRAVANDO_DEBOUNCE_MS) {
      if (!gravandoDebounceTimer) {
        gravandoDebounceTimer = window.setTimeout(() => {
          gravandoDebounceTimer = null
          enviarGravando()
        }, GRAVANDO_DEBOUNCE_MS - (Date.now() - ultimoGravandoEnviado))
      }
      return
    }
    ultimoGravandoEnviado = agora
    void api.gravandoAudio(conversaAtivaId.value).catch(() => { })
  }

  function tratarGravando(conversaId: number, usuarioId: number) {
    const auth = useAuthStore()
    if (usuarioId === auth.user?.id) return

    let mapa = gravandoPorConversa.value.get(conversaId)
    if (!mapa) {
      mapa = new Map()
      gravandoPorConversa.value.set(conversaId, mapa)
    }

    const timerExistente = mapa.get(usuarioId)
    if (timerExistente) window.clearTimeout(timerExistente)

    const timer = window.setTimeout(() => {
      const m = gravandoPorConversa.value.get(conversaId)
      if (m) {
        m.delete(usuarioId)
        if (m.size === 0) gravandoPorConversa.value.delete(conversaId)
        gravandoPorConversa.value = new Map(gravandoPorConversa.value)
      }
    }, GRAVANDO_EXPIRACAO_MS)

    mapa.set(usuarioId, timer)
    gravandoPorConversa.value = new Map(gravandoPorConversa.value)
  }

  function limparGravandoConversaAtiva() {
    if (gravandoDebounceTimer) {
      window.clearTimeout(gravandoDebounceTimer)
      gravandoDebounceTimer = null
    }
    ultimoGravandoEnviado = 0
  }

  async function adicionarMembroGrupo(conversaId: number, usuarioId: number) {
    await api.addUsuarioConversa(conversaId, usuarioId)
    delete usuariosConversa.value[conversaId]
    await carregarUsuariosConversa(conversaId)
  }

  async function removerMembroGrupo(conversaId: number, conversaUsuarioId: number) {
    await api.removeUsuarioConversa(conversaUsuarioId)
    delete usuariosConversa.value[conversaId]
    await carregarUsuariosConversa(conversaId)
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
    encaminharMensagemParaConversa,
    encaminharMensagemParaContato,
    criarGrupo,
    renomearGrupo,
    enviarTexto,
    enviarArquivo,
    enviarMensagemComConteudos,
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
    gravandoNaConversaAtiva,
    enviarGravando,
    limparGravandoConversaAtiva,
    registrarHandlerChamada,
    removerHandlerChamada,
    usuariosConversaAtiva,
    carregarUsuariosConversa,
    mensagemRespondendo,
    responderMensagem,
    cancelarResposta,
    adicionarMembroGrupo,
    removerMembroGrupo
  }
})

