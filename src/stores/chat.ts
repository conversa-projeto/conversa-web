import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { TipoConversa, TipoConteudo, TipoEventoSocket, TipoMensagemReferencia } from '../types/api'
import type { Contato, ConteudoMensagem, Conversa, EventoChamadaSocket, EventoSocket, Mensagem, PresencaContato, SinalChamada } from '../types/api'
import * as api from '../services/conversaApi'
import { useAuthStore } from './auth'
import { useCallStore } from './call'
import { useAtividadesStore } from './atividades'
import { useEnquetesStore } from './enquetes'
import { useAgora } from '../composables/useAgora'
import { playNotificationSound, showNotification, fecharNotificacao, requestNotificationPermission } from '../utils/sound'
import { resumirTexto } from '../utils/formatters'
import { ordenarMensagens, primeiraMensagemSalva } from '../utils/ordemMensagens'
import { useUploadProgress } from '../composables/useUploadProgress'

// Bloco do campo de mensagem: textos, arquivos e figurinhas na ordem em que
// foram compostos
export type BlocoMensagem =
  | { texto: string }
  | { figurinha: string }
  | { arquivo: { blob: Blob; nomeArquivo: string; mimeType?: string; isAudio?: boolean; isGravacaoAudio?: boolean } }

export const LIMITE_REACOES_POR_PESSOA = 5

export const useChatStore = defineStore('chat', () => {
  const contatos = ref<Contato[]>([])
  const conversas = ref<Conversa[]>([])
  const mensagensPorConversa = ref<Record<number, Mensagem[]>>({})
  const conversaAtivaId = ref<number | null>(null)
  const resultadosBuscaConversa = ref<Mensagem[]>([])
  const resultadosBuscaGlobal = ref<Mensagem[]>([])
  const buscandoGlobal = ref(false)
  const carregando = ref(false)
  const conectadoTempoReal = ref(false)

  let polling: number | null = null
  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let reconnectAttempts = 0
  const marcandoVisualizacao = new Set<number>()

  const mensagemRespondendo = ref<Mensagem | null>(null)
  // Resposta comum, ou Encaminhada quando a resposta é no privado
  const tipoReferenciaPendente = ref<TipoMensagemReferencia>(TipoMensagemReferencia.Resposta)
  // A próxima mensagem enviada pede confirmação de leitura; vale só para a conversa aberta
  const pedirConfirmacao = ref(false)
  watch(conversaAtivaId, () => { pedirConfirmacao.value = false })
  const usuariosConversa = ref<Record<number, Array<{ id: number; usuario_id: number; nome: string; avatar_url?: string | null }>>>({})

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

  // Estado de cada contato de conversa direta (quem não está aqui está offline)
  const presencas = ref<Map<number, PresencaContato>>(new Map())
  // Quem está com cada conversa aberta agora
  const presentesPorConversa = ref<Map<number, Set<number>>>(new Map())

  /**
   * Cursor de sincronizacao incremental — timestamp ISO-8601 do ultimo ponto
   * conhecido da timeline efetiva. Usado por GET /mensagens/novas?desde=<cursor>.
   *
   * Inicializado com now() no mount (nao usamos localStorage — o reload refaz
   * rehidratacao via getConversas + getMensagens e o cursor avanca via sync).
   *
   * Atualizado sempre com Math.max por:
   * - campo `ate` retornado por /mensagens/novas
   * - `coalesce(visivel_em, inserida)` de mensagens processadas via WebSocket
   *
   * Mensagens agendadas futuras do autor NAO avancam o cursor (filtro <= now),
   * senao mensagens normais enviadas antes de visivel_em sumiriam da sync.
   */
  const cursorSync = ref<Date>(new Date())

  function avancarCursorSync(momento: Date | null | undefined) {
    if (!momento) return
    if (momento.getTime() > Date.now()) return
    if (momento > cursorSync.value) cursorSync.value = momento
  }

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

  // Agendadas da conversa aberta que ainda não saíram: ficam fora do chat (e na
  // lista do relógio, ao lado do microfone). O agora é atualizado bem na hora
  // da próxima, que então entra no chat.
  const proximaAgendada = ref<Date | null>(null)
  const agora = useAgora(() => proximaAgendada.value)
  const agendadasAtivas = computed(() => mensagensAtivas.value
    .filter((m) => m.visivel_em && new Date(m.visivel_em).getTime() > agora.value)
    .sort((a, b) => new Date(a.visivel_em!).getTime() - new Date(b.visivel_em!).getTime()))
  const idsAgendadasAtivas = computed(() => new Set(agendadasAtivas.value.map((m) => m.id)))
  watch(agendadasAtivas, (lista) => { proximaAgendada.value = lista[0]?.visivel_em ?? null }, { immediate: true })

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

  // --- Fixar e arquivar (valem só para o usuário) ---

  function conversaArquivada(conversaId: number) {
    return !!conversas.value.find((c) => c.id === conversaId)?.arquivada_em
  }

  const conversasFixadas = computed(() => conversas.value
    .filter((c) => c.fixada_ordem != null && !c.arquivada_em)
    .sort((a, b) => a.fixada_ordem! - b.fixada_ordem!))

  async function salvarFixadas(ids: number[]) {
    for (const conversa of conversas.value) {
      conversa.fixada_ordem = ids.includes(conversa.id) ? ids.indexOf(conversa.id) + 1 : null
    }
    try {
      await api.ordenarConversasFixadas(ids)
    } catch (e) {
      await carregarConversas()
      throw e
    }
  }

  async function fixarConversa(conversaId: number, fixar: boolean) {
    const ids = conversasFixadas.value.map((c) => c.id).filter((id) => id !== conversaId)
    if (fixar) ids.push(conversaId)
    await salvarFixadas(ids)
  }

  // Leva a fixada para antes (ou depois) de outra, ao soltar o arraste
  async function moverFixada(conversaId: number, alvoId: number, depois: boolean) {
    const ids = conversasFixadas.value.map((c) => c.id).filter((id) => id !== conversaId)
    const posicao = ids.indexOf(alvoId)
    if (posicao < 0) return
    ids.splice(posicao + (depois ? 1 : 0), 0, conversaId)
    if (ids.join() === conversasFixadas.value.map((c) => c.id).join()) return
    await salvarFixadas(ids)
  }

  // Arquivada some da lista e não toca nem notifica; mensagens continuam chegando
  async function arquivarConversa(conversaId: number, arquivada: boolean) {
    const conversa = conversas.value.find((c) => c.id === conversaId)
    if (conversa) {
      conversa.arquivada_em = arquivada ? new Date() : null
      if (arquivada) conversa.fixada_ordem = null
    }
    if (arquivada) fecharNotificacao(conversaId)
    try {
      await api.arquivarConversa(conversaId, arquivada)
    } catch (e) {
      await carregarConversas()
      throw e
    }
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
      // Preservar mensagens otimistas que ainda estão sendo enviadas
      const enviando = (mensagensPorConversa.value[conversaId] || []).filter(m => m.enviando)
      mensagensPorConversa.value[conversaId] = enviando.length > 0
        ? [...mensagens, ...enviando]
        : mensagens
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

    const referencia = primeiraMensagemSalva(atuais)?.id || 0
    if (!referencia) return 0

    const anteriores = await api.getMensagens(conversaId, referencia, limite, 0)
    if (!anteriores.length) return 0

    const mapa = new Map<number, Mensagem>()
    for (const msg of anteriores) mapa.set(msg.id, msg)
    for (const msg of atuais) mapa.set(msg.id, msg)

    const merged = ordenarMensagens(Array.from(mapa.values()))
    const antes = atuais.length
    mensagensPorConversa.value[conversaId] = merged
    return Math.max(0, merged.length - antes)
  }

  function definirMensagens(conversaId: number, mensagens: Mensagem[]) {
    mensagensPorConversa.value[conversaId] = mensagens
  }

  async function obterOuCriarConversaDireta(contato: Pick<Contato, 'id' | 'nome'>) {
    const auth = useAuthStore()
    if (!auth.user) {
      throw new Error('Usuário não autenticado')
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
      throw new Error('Usuário não autenticado')
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

  // Imagem ou emoji no lugar da primeira letra; um tira o outro
  async function alterarAvatarGrupo(conversaId: number, avatar: { anexoId: number } | { emoji: string } | null) {
    await api.atualizarConversa(conversaId, {
      avatar_anexo_id: avatar && 'anexoId' in avatar ? avatar.anexoId : null,
      emoji: avatar && 'emoji' in avatar ? avatar.emoji : null,
    })
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
    tipoReferenciaPendente.value = TipoMensagemReferencia.Resposta
  }

  // Abre a conversa direta com quem enviou a mensagem do grupo, já com ela
  // encaminhada no campo de texto para acrescentar o comentário
  async function responderNoPrivado(msg: Mensagem) {
    const conversa = await obterOuCriarConversaDireta({ id: msg.remetente_id, nome: msg.remetente })
    await selecionarConversa(conversa.id)
    mensagemRespondendo.value = msg
    tipoReferenciaPendente.value = TipoMensagemReferencia.Encaminhada
  }

  function cancelarResposta() {
    mensagemRespondendo.value = null
    tipoReferenciaPendente.value = TipoMensagemReferencia.Resposta
  }

  function criarMensagemReferenciaResumo(origem: Mensagem, tipo: TipoMensagemReferencia) {
    return {
      tipo,
      origem_mensagem_id: origem.id,
      mensagem: {
        id: origem.id,
        conversa_id: origem.conversa_id,
        remetente: origem.remetente,
        inserida: origem.inserida,
        conteudos: origem.conteudos,
        mensagem_referencia: origem.mensagem_referencia || null
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
      throw new Error('Usuário não autenticado')
    }

    const conteudos = clonarConteudosParaEnvio(origem.conteudos)

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

  async function enviarMensagemComConteudos(texto: string, arquivos: ConteudoArquivoEntrada[] = [], visivelEm: Date | null = null, figurinha: string | null = null, blocos: BlocoMensagem[] | null = null) {

    if (!conversaAtivaId.value) {
      throw new Error('Nenhuma conversa ativa')
    }

    const textoLimpo = texto.trim()
    if (!textoLimpo && arquivos.length === 0 && !figurinha && !blocos?.length && !mensagemRespondendo.value) {
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

    // Encaminhada (resposta no privado): os conteúdos dela vêm antes do texto
    const tipoReferencia = tipoReferenciaPendente.value
    if (tipoReferencia === TipoMensagemReferencia.Encaminhada && mensagemRespondendo.value) {
      for (const conteudo of mensagemRespondendo.value.conteudos.slice().sort((a, b) => a.ordem - b.ordem)) {
        conteudosOptimistas.push({ ...conteudo, ordem })
        conteudosApi.push({ ordem, tipo: conteudo.tipo, conteudo: conteudo.conteudo })
        ordem += 1
      }
    }

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

    if (figurinha) {
      conteudosOptimistas.push({ ordem, tipo: TipoConteudo.Figurinha, conteudo: figurinha })
      conteudosApi.push({ ordem, tipo: TipoConteudo.Figurinha, conteudo: figurinha })
      ordem += 1
    }

    const arquivosInfo: Array<{ blob: Blob; nomeArquivo: string; extensao: string; tipo: TipoConteudo; ordem: number }> = []

    // Com blocos (editor avançado), textos e arquivos vão na ordem deles
    for (const item of blocos ?? arquivos.map((arquivo) => ({ arquivo }))) {
      if ('texto' in item) {
        conteudosOptimistas.push({ ordem, tipo: TipoConteudo.Texto, conteudo: item.texto })
        conteudosApi.push({ ordem, tipo: TipoConteudo.Texto, conteudo: item.texto })
        ordem += 1
        continue
      }
      if ('figurinha' in item) {
        conteudosOptimistas.push({ ordem, tipo: TipoConteudo.Figurinha, conteudo: item.figurinha })
        conteudosApi.push({ ordem, tipo: TipoConteudo.Figurinha, conteudo: item.figurinha })
        ordem += 1
        continue
      }
      const arq = item.arquivo
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
      ? { tipo: tipoReferencia, origem_mensagem_id: respostaMsg.id }
      : undefined
    mensagemRespondendo.value = null
    tipoReferenciaPendente.value = TipoMensagemReferencia.Resposta
    const pedeConfirmacao = pedirConfirmacao.value
    pedirConfirmacao.value = false

    // Adiciona mensagem otimista ? UI imediatamente (antes dos uploads)
    const optimisticMsg: Mensagem = {
      id: tempId,
      remetente_id: auth.user.id,
      remetente: auth.user.nome,
      conversa_id: conversaId,
      inserida: new Date(),
      alterada: new Date(),
      visivel_em: visivelEm,
      recebida: false,
      visualizada: false,
      reproduzida: false,
      enviando: true,
      conteudos: conteudosOptimistas,
      ...(pedeConfirmacao ? { confirmacao: { total: 0, confirmou: false, usuarios: [] } } : {}),
      ...(mensagemReferencia && respostaMsg ? {
        mensagem_referencia: criarMensagemReferenciaResumo(respostaMsg, tipoReferencia),
      } : {})
    }

    if (!mensagensPorConversa.value[conversaId]) {
      mensagensPorConversa.value[conversaId] = []
    }
    mensagensPorConversa.value[conversaId] = [...mensagensPorConversa.value[conversaId], optimisticMsg]

    const { iniciarUpload, finalizarUpload, limparTodos } = useUploadProgress()

    try {
      // Faz uploads após a mensagem já estar visível
      for (const arq of arquivosInfo) {
        const uploadId = `${tempId}-${arq.ordem}`
        const onProgress = iniciarUpload(uploadId, arq.nomeArquivo)
        const anexo = await api.uploadAnexo(arq.tipo, arq.nomeArquivo, arq.extensao, arq.blob, onProgress)
        finalizarUpload(uploadId)
        conteudosApi.push({
          ordem: arq.ordem,
          tipo: arq.tipo,
          conteudo: anexo.identificador
        })
      }

      const resp = await api.enviarMensagem(conversaId, conteudosApi, mensagemReferencia, visivelEm, pedeConfirmacao)

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

      const msgs = mensagensPorConversa.value[conversaId] ?? []
      const idx = msgs.findIndex(m => m.id === tempId)
      const otimista = msgs[idx]
      if (otimista) {
        msgs[idx] = {
          ...otimista,
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
      limparTodos()
      mensagensPorConversa.value[conversaId] = mensagensPorConversa.value[conversaId].filter(m => m.id !== tempId)
      for (const url of localUrlsParaLimpar) {
        URL.revokeObjectURL(url)
      }
      throw e
    }
  }

  async function enviarTexto(texto: string, visivelEm: Date | null = null) {
    await enviarMensagemComConteudos(texto, [], visivelEm)
  }

  // Votação: o servidor cria a enquete e a mensagem que a leva
  async function criarEnquete(pergunta: string, opcoes: string[], multipla: boolean, encerraEm: Date | null = null) {
    const conversaId = conversaAtivaId.value
    if (!conversaId) throw new Error('Nenhuma conversa ativa')
    await api.criarEnquete(conversaId, pergunta, opcoes, multipla, encerraEm)
    await carregarMensagens(conversaId)
    void carregarConversas()
  }

  // Campo de mensagem com texto, anexos e figurinhas intercalados numa mensagem só
  async function enviarBlocos(blocos: BlocoMensagem[]) {
    await enviarMensagemComConteudos('', [], null, null, blocos)
  }

  // Figurinha vai sozinha, como no envio pelo seletor (ou como resposta)
  async function enviarFigurinha(figurinha: string) {
    await enviarMensagemComConteudos('', [], null, figurinha)
  }

  async function enviarArquivo(blob: Blob, nomeArquivo: string, mimeType = '', isAudio = false) {
    await enviarMensagemComConteudos('', [{ blob, nomeArquivo, mimeType, isAudio }])
  }

  // Excluir marca a mensagem, que continua na conversa. Só a agendada que
  // ainda não saiu é apagada de vez (a resposta vem sem excluida_em).
  async function excluirMensagem(mensagemId: number) {
    const resposta = await api.deletarMensagem(mensagemId)
    const excluidaEm = 'excluida_em' in resposta ? resposta.excluida_em : null
    for (const cid of Object.keys(mensagensPorConversa.value)) {
      const lista = mensagensPorConversa.value[Number(cid)]
      if (!lista?.some(m => m.id === mensagemId)) continue
      if (excluidaEm) {
        lista.forEach((m) => { if (m.id === mensagemId) m.excluida_em = excluidaEm })
      } else {
        mensagensPorConversa.value[Number(cid)] = lista.filter(m => m.id !== mensagemId)
      }
    }
    // A prévia da conversa na lista passa a dizer "Mensagem oculta"
    if (excluidaEm) await carregarConversas()
  }
  async function carregarContextoMensagem(conversaId: number, mensagemId: number, previas = 30, seguintes = 30) {
    let bloco = await api.getMensagens(conversaId, mensagemId, previas, seguintes)

    if (!bloco.some(m => m.id === mensagemId)) {
      // Fallback para uma janela maior, caso o backend limite o primeiro retorno.
      bloco = await api.getMensagens(conversaId, mensagemId, 120, 120)
    }

    if (!bloco.length) return false

    // Substituir (não merge) para que a paginação bidirecional funcione
    // a partir do contexto da mensagem encontrada.
    mensagensPorConversa.value[conversaId] = ordenarMensagens(bloco)
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

    const resultado = await api.pesquisarMensagens(termo, conversaAtivaId.value!)
    // Filtro no frontend como fallback caso o backend não filtre por conversa
    resultadosBuscaConversa.value = resultado.filter((mensagem) => mensagem.conversa_id === conversaAtivaId.value)
  }

  async function buscarEmTodosChats(texto: string) {
    const auth = useAuthStore()
    if (!auth.user) {
      resultadosBuscaGlobal.value = []
      return
    }

    const termo = texto.trim()
    if (!termo) {
      resultadosBuscaGlobal.value = []
      return
    }

    buscandoGlobal.value = true
    try {
      resultadosBuscaGlobal.value = await api.pesquisarMensagens(termo)
    } finally {
      buscandoGlobal.value = false
    }
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
    for (const [idx, mensagem] of pendentes.entries()) {
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

        // --- Fechar notificação do Windows ao visualizar tudo ---
        // Quando mensagens_sem_visualizar chega a 0, não há mais motivo para
        // a notificação persistir. fecharNotificacao() fecha via close() e
        // remove a referência do mapa em sound.ts.
        // Este é o ponto de fechamento principal — garante que a notificação
        // desapareça assim que o usuário vê todas as mensagens pendentes.
        if (conversa.mensagens_sem_visualizar === 0) {
          fecharNotificacao(conversaId)
        }
      }
      void carregarConversas()
    }
    return marcadas > 0
  }

  function getWebSocketUrl(): string {
    const isSecure = window.location.protocol === 'https:'
    const wsProtocol = isSecure ? 'wss:' : 'ws:'
    const wsPath = import.meta.env.VITE_WS_PATH || '/ws/'
    return `${wsProtocol}//${window.location.host}${wsPath}`
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
      // Quem entrou ou saiu enquanto o socket estava fora não gerou aviso
      void carregarContatosOnline()
      ultimaPresenca = ''
      acompanharPresenca()
      enviarPresenca()
      if (conversaAtivaId.value) void carregarPresentes(conversaAtivaId.value)
      // Nem as atividades que chegaram nesse tempo
      void useAtividadesStore().atualizarNovas()
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
      // Sem conexão, o próprio status (que vem do servidor) fica desconhecido
      const eu = useAuthStore().user?.id
      if (eu && presencas.value.has(eu)) {
        const novo = new Map(presencas.value)
        novo.delete(eu)
        presencas.value = novo
      }
      agendarReconexaoWebSocket()
    }
  }

  // Sinal para os outros participantes da chamada; com o socket fora, se perde
  function enviarSinalChamada(chamadaId: number, dados: SinalChamada) {
    if (socket?.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ tipo: TipoEventoSocket.SinalChamada, chamada_id: chamadaId, dados }))
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

        const carregadas = mensagensPorConversa.value[conversaId] || []
        const desconhecida = mensagens.some((id) => !carregadas.some((m) => m.id === id))
        if (desconhecida && conversaAtivaId.value === conversaId) {
          await carregarMensagens(conversaId)
        }
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

    if (evento.tipo === TipoEventoSocket.ReacaoMensagem) {
      tratarReacaoSocket(evento)
      return
    }

    if (evento.tipo === TipoEventoSocket.ConfirmacaoLeitura) {
      tratarConfirmacaoSocket(evento)
      return
    }

    if (evento.tipo === TipoEventoSocket.ConversaAtualizada) {
      await carregarConversas()
      return
    }

    if (evento.tipo === TipoEventoSocket.EnqueteAtualizada && (evento as Record<string, unknown>).enquete_id) {
      useEnquetesStore().aoAtualizar(Number((evento as Record<string, unknown>).enquete_id))
      return
    }

    if (evento.tipo === TipoEventoSocket.NovaAtividade) {
      void useAtividadesStore().aoReceberAviso()
      return
    }

    if (evento.tipo === TipoEventoSocket.StatusUsuario && evento.usuario_id != null) {
      tratarStatusUsuario(evento)
      return
    }

    if (evento.tipo === TipoEventoSocket.Presenca) {
      tratarPresencaConversa(evento)
      return
    }

    if (evento.tipo && evento.tipo >= TipoEventoSocket.ChamadaRecebida && evento.tipo <= TipoEventoSocket.SinalChamada && _tratarEventoChamada) {
      _tratarEventoChamada(evento as EventoChamadaSocket)
      return
    }
  }

  async function tratarNovaMensagem() {
    const novas = await api.getMensagensNovas(cursorSync.value)
    if (novas.length === 0) {
      return
    }

    // Avanca o cursor para o maior `ate` retornado (sempre <= now pelo servidor).
    for (const item of novas) {
      avancarCursorSync(item.ate)
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

    // Defensivo: avanca cursor tambem pelo timestamp efetivo de cada mensagem
    // processada (cobre caso de `ate` estar dessincronizado com o detalhe).
    for (const m of todasNovasDetalhes) {
      avancarCursorSync(m.visivel_em ?? m.inserida)
    }

    // Verifica se há novas mensagens de outros usuários que devem disparar notificação
    const deOutrosParaNotificar = todasNovasDetalhes.filter((m) => {
      const isMe = m.remetente_id === meuId
      const isChatAtivoEFocado = m.conversa_id === ativa && document.hasFocus()
      return !isMe && !isChatAtivoEFocado && !conversaArquivada(m.conversa_id)
    })

    if (deOutrosParaNotificar.length > 0) {
      // Toca o som de notificação (independente de foco — o som toca sempre)
      playNotificationSound()

      // --- Notificações do Windows ---
      // Também com a janela em foco: o filtro acima já deixa de fora só a
      // conversa aberta com a janela focada, que o usuário está vendo.
      // Agrupar por conversa: cada conversa mantém UMA notificação no Windows.
      // O Map naturalmente mantém a última mensagem de cada conversa (sobrescreve).
      // Isso garante que a notificação mostre o conteúdo mais recente.
      const porConversa = new Map<number, Mensagem>()
      for (const msg of deOutrosParaNotificar) {
        porConversa.set(msg.conversa_id, msg)
      }

      // Para cada conversa com novas mensagens: criar/atualizar notificação.
      // O título é o nome do remetente (quem enviou a última mensagem).
      // O body é o conteúdo da mensagem (texto, ou tipo "Imagem", "Audio", etc).
      // showNotification() cuida de fechar a anterior e criar a nova
      // (ver documentação detalhada em sound.ts).
      for (const [convId, ultima] of porConversa) {
        const contato = contatos.value.find((c) => c.id === ultima.remetente_id)
        const conversa = conversas.value.find((c) => c.id === convId)
        const nomeRemetente = contato?.nome || ultima.remetente || 'Nova mensagem'

        // Avatar: prioridade contato > conversa > logo do app
        const avatarUrl = contato?.avatar_url || conversa?.avatar_url || '/logo.png'

        let texto = ''
        const c = ultima.conteudos?.[0]
        if (c) {
          if (c.tipo === TipoConteudo.Texto) texto = resumirTexto(c.conteudo)
          else if (c.tipo === TipoConteudo.Imagem) texto = 'Imagem'
          else if (c.tipo === TipoConteudo.GravacaoAudio) texto = 'Gravacao de audio'
          else if (c.tipo === TipoConteudo.Audio) texto = 'Audio'
          else if (c.tipo === TipoConteudo.Figurinha) texto = 'Figurinha'
          else if (c.tipo === TipoConteudo.Enquete) texto = 'Votação'
          else texto = 'Arquivo'
        }

        showNotification(convId, nomeRemetente, {
          body: texto,
          icon: avatarUrl,
          silent: true
        }, () => {
          // Ao clicar na notificação: abrir a conversa correspondente
          void selecionarConversa(convId)
        })
      }
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
      mensagem.excluida_em = item.excluida_em
    }
  }

  function iniciarPolling() {
    pararPolling()
    polling = window.setInterval(async () => {
      if (conectadoTempoReal.value) {
        return
      }
      await tratarNovaMensagem()
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

  async function reagirMensagem(mensagemId: number, emoji: string) {
    const auth = useAuthStore()
    if (!auth.user) return

    const msg = Object.values(mensagensPorConversa.value).flat().find(m => m.id === mensagemId)
    // Cada pessoa deixa no máximo 5 emojis diferentes na mesma mensagem (o
    // servidor confere de novo)
    const minhas = msg?.reacoes?.filter(r => r.reagiu) ?? []
    if (!minhas.some(r => r.emoji === emoji) && minhas.length >= LIMITE_REACOES_POR_PESSOA) {
      throw new Error(`Você já reagiu com ${LIMITE_REACOES_POR_PESSOA} emojis nesta mensagem.`)
    }

    // Atualização otimista
    if (msg) atualizarReacaoLocal(msg, emoji, auth.user.id)

    try {
      await api.reagirMensagem(mensagemId, emoji)
    } catch (e) {
      // Em caso de erro, recarregar mensagens da conversa ativa
      if (conversaAtivaId.value) {
        await carregarMensagens(conversaAtivaId.value)
      }
      throw e
    }
  }

  function resolverNomeUsuario(usuarioId: number): { nome: string; avatar_url?: string | null } {
    const auth = useAuthStore()
    if (usuarioId === auth.user?.id) {
      return { nome: auth.user.nome || auth.user.login, avatar_url: auth.avatarUrl || auth.user.avatar_url }
    }
    const contato = contatos.value.find(c => c.id === usuarioId)
    if (contato) {
      return { nome: contato.nome, avatar_url: contato.avatar_url }
    }
    return { nome: `Usuário ${usuarioId}` }
  }

  function atualizarReacaoLocal(msg: Mensagem, emoji: string, usuarioId: number, acao?: string) {
    if (!msg.reacoes) msg.reacoes = []

    const auth = useAuthStore()
    const souEu = usuarioId === auth.user?.id
    const reacaoExistente = msg.reacoes.find(r => r.emoji === emoji)

    // Se acao não é especificada, determinar automaticamente (toggle)
    const deveRemover = acao === 'remove' || (!acao && reacaoExistente?.reagiu)

    if (deveRemover) {
      if (reacaoExistente) {
        reacaoExistente.quantidade--
        if (souEu) reacaoExistente.reagiu = false
        if (reacaoExistente.usuarios) {
          reacaoExistente.usuarios = reacaoExistente.usuarios.filter(u => u.usuario_id !== usuarioId)
        }
        if (reacaoExistente.quantidade <= 0) {
          msg.reacoes = msg.reacoes.filter(r => r.emoji !== emoji)
        }
      }
    } else {
      const info = resolverNomeUsuario(usuarioId)
      const novoUsuario = { usuario_id: usuarioId, nome: info.nome, avatar_url: info.avatar_url, reagido_em: new Date() }

      if (reacaoExistente) {
        reacaoExistente.quantidade++
        if (souEu) reacaoExistente.reagiu = true
        if (!reacaoExistente.usuarios) reacaoExistente.usuarios = []
        if (!reacaoExistente.usuarios.some(u => u.usuario_id === usuarioId)) {
          reacaoExistente.usuarios.push(novoUsuario)
        }
      } else {
        msg.reacoes.push({ emoji, quantidade: 1, reagiu: souEu, usuarios: [novoUsuario] })
      }
    }
  }

  async function confirmarLeitura(msg: Mensagem) {
    if (!msg.confirmacao || msg.confirmacao.confirmou) return
    await api.confirmarLeitura(msg.id)
    const auth = useAuthStore()
    if (auth.user) adicionarConfirmacaoLocal(msg, auth.user.id, new Date())
  }

  function adicionarConfirmacaoLocal(msg: Mensagem, usuarioId: number, confirmadaEm: Date, nome?: string) {
    if (!msg.confirmacao) return
    if (usuarioId === useAuthStore().user?.id) msg.confirmacao.confirmou = true
    if (msg.confirmacao.usuarios.some((u) => u.usuario_id === usuarioId)) return
    const info = resolverNomeUsuario(usuarioId)
    msg.confirmacao.usuarios.push({ usuario_id: usuarioId, nome: nome || info.nome, avatar_url: info.avatar_url, confirmada_em: confirmadaEm })
  }

  function tratarConfirmacaoSocket(evento: EventoSocket) {
    if (!evento.conversa_id || !evento.mensagem_id || !evento.usuario_id) return
    const msg = mensagensPorConversa.value[evento.conversa_id]?.find(m => m.id === evento.mensagem_id)
    if (msg) adicionarConfirmacaoLocal(msg, evento.usuario_id, evento.confirmada_em ? new Date(evento.confirmada_em) : new Date(), evento.nome)
  }

  function tratarReacaoSocket(evento: EventoSocket) {
    if (!evento.conversa_id || !evento.mensagem_id || !evento.emoji || !evento.acao || !evento.usuario_id) return

    const mensagens = mensagensPorConversa.value[evento.conversa_id]
    if (!mensagens) return

    const msg = mensagens.find(m => m.id === evento.mensagem_id)
    if (!msg) return

    atualizarReacaoLocal(msg, evento.emoji, evento.usuario_id, evento.acao)
  }

  function tratarStatusUsuario(evento: EventoSocket) {
    const usuarioId = evento.usuario_id!
    const estado = evento.estado ?? (evento.online ? 'ativo' : 'offline')
    const novo = new Map(presencas.value)
    // O visto por último só vem quando muda; sem ele, fica o que já se sabia
    novo.set(usuarioId, { estado, visto_em: evento.visto_em ? new Date(evento.visto_em) : presencas.value.get(usuarioId)?.visto_em ?? null })
    presencas.value = novo
  }

  function presencaDe(usuarioId: number): PresencaContato {
    return presencas.value.get(usuarioId) ?? { estado: 'offline', visto_em: null }
  }

  function estaOnline(usuarioId: number): boolean {
    return presencaDe(usuarioId).estado !== 'offline'
  }

  async function carregarContatosOnline() {
    try {
      const lista = await api.getContatosPresenca()
      presencas.value = new Map(lista.map(({ usuario_id, estado, visto_em }) => [usuario_id, { estado, visto_em }]))
    } catch {
      // Silently fail — status is non-critical
    }
  }

  // --- Presença desta aba: visível e em uso, e a conversa aberta ---

  const TEMPO_OCIOSO_MS = 5 * 60 * 1000
  let ocioso = false
  let timerOcioso: number | null = null
  let ultimaPresenca = ''

  function enviarPresenca() {
    if (socket?.readyState !== WebSocket.OPEN) return
    const ativo = document.visibilityState === 'visible' && !ocioso
    const dados = { tipo: TipoEventoSocket.Presenca, ativo, conversa_id: ativo ? conversaAtivaId.value : null }
    const texto = JSON.stringify(dados)
    if (texto === ultimaPresenca) return
    ultimaPresenca = texto
    socket.send(texto)
  }

  // Sem mexer na página por 5 minutos, a aba deixa de contar como ativa
  function marcarUso() {
    if (timerOcioso !== null) window.clearTimeout(timerOcioso)
    timerOcioso = window.setTimeout(() => {
      ocioso = true
      enviarPresenca()
    }, TEMPO_OCIOSO_MS)
    if (ocioso) {
      ocioso = false
      enviarPresenca()
    }
  }

  let acompanhandoPresenca = false
  function acompanharPresenca() {
    if (acompanhandoPresenca) return
    acompanhandoPresenca = true
    document.addEventListener('visibilitychange', enviarPresenca)
    for (const evento of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) {
      window.addEventListener(evento, marcarUso, { passive: true })
    }
    marcarUso()
  }

  watch(conversaAtivaId, (id) => {
    enviarPresenca()
    if (id) void carregarPresentes(id)
  })

  async function carregarPresentes(conversaId: number) {
    try {
      const ids = await api.getPresentesConversa(conversaId)
      const novo = new Map(presentesPorConversa.value)
      novo.set(conversaId, new Set(ids))
      presentesPorConversa.value = novo
    } catch {
      // só deixa de mostrar quem está na conversa
    }
  }

  function tratarPresencaConversa(evento: EventoSocket) {
    if (!evento.conversa_id || !evento.usuario_id) return
    const novo = new Map(presentesPorConversa.value)
    const presentes = new Set(novo.get(evento.conversa_id))
    if (evento.aberta) presentes.add(evento.usuario_id)
    else presentes.delete(evento.usuario_id)
    novo.set(evento.conversa_id, presentes)
    presentesPorConversa.value = novo
  }

  function estaNaConversa(usuarioId: number, conversaId: number | null) {
    return conversaId !== null && !!presentesPorConversa.value.get(conversaId)?.has(usuarioId)
  }

  function encerrarTempoReal() {
    pararPolling()
    desconectarWebSocket()
  }

  async function recarregarMensagensRecentes(conversaId: number) {
    await carregarMensagens(conversaId)
  }

  return {
    contatos,
    conversas,
    conversaAtiva,
    conversasFixadas,
    conversaArquivada,
    fixarConversa,
    moverFixada,
    arquivarConversa,
    conversaAtivaId,
    mensagensAtivas,
    agendadasAtivas,
    idsAgendadasAtivas,
    resultadosBuscaConversa,
    resultadosBuscaGlobal,
    buscandoGlobal,
    carregando,
    conectadoTempoReal,
    inicializar,
    carregarContatos,
    carregarConversas,
    selecionarConversa,
    carregarMensagensAnteriores,
    definirMensagens,
    iniciarConversaDireta,
    encaminharMensagemParaConversa,
    encaminharMensagemParaContato,
    criarGrupo,
    renomearGrupo,
    pedirConfirmacao,
    confirmarLeitura,
    alterarAvatarGrupo,
    enviarTexto,
    enviarArquivo,
    enviarFigurinha,
    enviarBlocos,
    criarEnquete,
    excluirMensagem,
    enviarMensagemComConteudos,
    buscarNaConversa,
    buscarEmTodosChats,
    carregarContextoMensagem,
    iniciarPolling,
    pararPolling,
    conectarWebSocket,
    desconectarWebSocket,
    enviarSinalChamada,
    encerrarTempoReal,
    marcarMensagensComoVisualizadas,
    digitandoPorConversa,
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
    tipoReferenciaPendente,
    responderMensagem,
    responderNoPrivado,
    cancelarResposta,
    adicionarMembroGrupo,
    removerMembroGrupo,
    reagirMensagem,
    recarregarMensagensRecentes,
    presencas,
    presentesPorConversa,
    presencaDe,
    estaOnline,
    estaNaConversa
  }
})

