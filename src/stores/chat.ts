import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Contato, Conversa, Mensagem } from '../types/api'
import { getAttachmentUrl } from '../services/http'
import * as api from '../services/conversaApi'
import { useAuthStore } from './auth'

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

  const conversaAtiva = computed(() => conversas.value.find((item) => item.id === conversaAtivaId.value) || null)
  const mensagensAtivas = computed(() => {
    if (!conversaAtivaId.value) {
      return []
    }
    return mensagensPorConversa.value[conversaAtivaId.value] || []
  })

  async function inicializar() {
    await Promise.all([carregarContatos(), carregarConversas()])
    if (!conversaAtivaId.value && conversas.value.length > 0) {
      await selecionarConversa(conversas.value[0].id)
    }
    conectarWebSocket()
    iniciarPolling()
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

    await api.enviarMensagem(conversaAtivaId.value, [
      {
        ordem: 1,
        tipo: 1,
        conteudo: texto
      }
    ])

    await Promise.all([carregarConversas(), atualizarConversaAtiva()])
  }

  async function enviarArquivo(blob: Blob, nomeArquivo: string, mimeType = '', isAudio = false) {
    if (!conversaAtivaId.value) {
      throw new Error('Nenhuma conversa ativa')
    }

    const extensao = (nomeArquivo.split('.').pop() || '').slice(0, 10)
    const tipo = isAudio ? 4 : mimeType.startsWith('image/') ? 2 : 3

    const anexo = await api.uploadAnexo(tipo, nomeArquivo, extensao, blob)
    await api.enviarMensagem(conversaAtivaId.value, [
      {
        ordem: 1,
        tipo,
        conteudo: anexo.identificador
      }
    ])

    await Promise.all([carregarConversas(), atualizarConversaAtiva()])
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
    const auth = useAuthStore()
    const apiBase = auth.apiBase?.trim() || 'http://localhost:90'
    const base = new URL(apiBase)
    const restPort = Number(base.port || (base.protocol === 'https:' ? 443 : 80))
    const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsPort = 8000 + restPort
    return `${wsProtocol}//${base.hostname}:${wsPort}`
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
    let evento: { tipo?: number; grupo?: number; conversa_id?: number; mensagens?: string } | null = null
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

    if (evento.tipo === 40) {
      await carregarConversas()
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

    const conversaIds = Array.from(new Set(novas.map((item) => item.conversa_id)))
    const ativa = conversaAtivaId.value

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
    }, 8000)
  }

  function pararPolling() {
    if (polling) {
      window.clearInterval(polling)
      polling = null
    }
  }

  function urlAnexo(identificador: string) {
    return getAttachmentUrl(identificador)
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
    iniciarConversaDireta,
    criarGrupo,
    enviarTexto,
    enviarArquivo,
    buscarNaConversa,
    iniciarPolling,
    pararPolling,
    conectarWebSocket,
    desconectarWebSocket,
    encerrarTempoReal,
    marcarMensagensComoVisualizadas,
    urlAnexo
  }
})
