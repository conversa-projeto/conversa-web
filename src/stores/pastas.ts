import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/conversaApi'
import { useChatStore } from './chat'
import type { Mensagem, PastaMensagens } from '../types/api'

// Aviso do servidor (WebSocket tipo 67)
export interface AvisoPasta {
  conversa_id?: number
  pasta_id?: number
  mensagens?: number[]
  acao?: 'incluir' | 'tirar'
}

// Pastas de mensagens da conversa direta aberta. A pasta só marca: a mensagem
// continua no chat (com a pasta em mensagem.pastas). Aqui ficam a lista do
// painel, as mensagens selecionadas no chat (para arrastar a uma pasta) e a
// pasta aberta, que mostra no lugar do chat só as mensagens dela.
export const usePastasStore = defineStore('pastas', () => {
  const conversaId = ref<number | null>(null)
  const lista = ref<PastaMensagens[]>([])
  const painelAberto = ref(false)

  const selecionadas = ref<number[]>([])
  const idsSelecionados = computed(() => new Set(selecionadas.value))
  // Mensagens sendo arrastadas do chat: o painel mostra onde soltar
  const arrastando = ref(false)

  const abertaId = ref<number | null>(null)
  const aberta = computed(() => lista.value.find((p) => p.id === abertaId.value) ?? null)
  const mensagensDaAberta = ref<Mensagem[]>([])
  const carregandoAberta = ref(false)
  const fimDaAberta = ref(false)

  const porId = computed(() => new Map(lista.value.map((p) => [p.id, p])))

  // Troca de conversa: limpa tudo e, na direta, lê as pastas dela
  async function usarConversa(id: number | null, direta: boolean) {
    selecionadas.value = []
    fecharPasta()
    conversaId.value = direta ? id : null
    lista.value = []
    if (!direta || !id) {
      painelAberto.value = false
      return
    }
    await carregar()
  }

  async function carregar() {
    const id = conversaId.value
    if (!id) return
    const pastas = await api.getPastas(id)
    if (conversaId.value !== id) return
    lista.value = pastas
    // Pasta que sumiu (excluída ou deixou de ser compartilhada) sai das bolhas e fecha
    const existentes = new Set(pastas.map((p) => p.id))
    for (const mensagem of mensagensDaConversa()) {
      if (mensagem.pastas?.some((p) => !existentes.has(p))) mensagem.pastas = mensagem.pastas.filter((p) => existentes.has(p))
    }
    if (abertaId.value && !existentes.has(abertaId.value)) fecharPasta()
  }

  function mensagensDaConversa(): Mensagem[] {
    const chat = useChatStore()
    return chat.conversaAtivaId === conversaId.value ? chat.mensagensAtivas : []
  }

  async function criar(nome: string, cor: string, compartilhada: boolean) {
    if (!conversaId.value) return
    const nova = await api.criarPasta(conversaId.value, nome, cor, compartilhada)
    if (!lista.value.some((p) => p.id === nova.id)) lista.value = ordenar([...lista.value, nova])
    return nova
  }

  async function alterar(id: number, alteracoes: { nome?: string; cor?: string; compartilhada?: boolean }) {
    const alterada = await api.alterarPasta(id, alteracoes)
    lista.value = ordenar(lista.value.map((p) => (p.id === id ? alterada : p)))
  }

  async function excluir(id: number) {
    await api.excluirPasta(id)
    lista.value = lista.value.filter((p) => p.id !== id)
    marcarNasBolhas(id, mensagensDaConversa().filter((m) => m.pastas?.includes(id)).map((m) => m.id), 'tirar')
    if (abertaId.value === id) fecharPasta()
  }

  function ordenar(pastas: PastaMensagens[]) {
    return [...pastas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }) || a.id - b.id)
  }

  async function porMensagens(pastaId: number, mensagens: number[]) {
    const ids = mensagens.filter((id) => id > 0)
    if (!ids.length) return
    await api.porMensagensNaPasta(pastaId, ids)
    marcarNasBolhas(pastaId, ids, 'incluir')
    await carregar()
    if (abertaId.value === pastaId) await recarregarAberta()
  }

  async function tirarMensagens(pastaId: number, mensagens: number[]) {
    await api.tirarMensagensDaPasta(pastaId, mensagens)
    marcarNasBolhas(pastaId, mensagens, 'tirar')
    if (abertaId.value === pastaId) mensagensDaAberta.value = mensagensDaAberta.value.filter((m) => !mensagens.includes(m.id))
    await carregar()
  }

  function marcarNasBolhas(pastaId: number, mensagens: number[], acao: 'incluir' | 'tirar') {
    const alvo = new Set(mensagens)
    for (const mensagem of mensagensDaConversa()) {
      if (!alvo.has(mensagem.id)) continue
      const atuais = mensagem.pastas ?? []
      if (acao === 'incluir' && !atuais.includes(pastaId)) mensagem.pastas = [...atuais, pastaId].sort((a, b) => a - b)
      if (acao === 'tirar' && atuais.includes(pastaId)) mensagem.pastas = atuais.filter((p) => p !== pastaId)
    }
  }

  // --- Seleção no chat ---

  function selecionar(ids: number[]) {
    selecionadas.value = ids.filter((id) => id > 0)
  }

  function alternarSelecao(id: number) {
    if (id <= 0) return
    selecionadas.value = idsSelecionados.value.has(id)
      ? selecionadas.value.filter((s) => s !== id)
      : [...selecionadas.value, id]
  }

  function limparSelecao() {
    selecionadas.value = []
  }

  // --- Pasta aberta (no lugar do chat, sem campo de mensagem) ---

  async function abrirPasta(id: number) {
    abertaId.value = id
    selecionadas.value = []
    mensagensDaAberta.value = []
    fimDaAberta.value = false
    await recarregarAberta()
  }

  async function recarregarAberta() {
    const id = abertaId.value
    if (!id) return
    carregandoAberta.value = true
    try {
      const mensagens = await api.getMensagensDaPasta(id)
      if (abertaId.value !== id) return
      mensagensDaAberta.value = mensagens
      fimDaAberta.value = mensagens.length < 50
    } finally {
      carregandoAberta.value = false
    }
  }

  async function carregarAnteriores() {
    const id = abertaId.value
    const primeira = mensagensDaAberta.value[0]
    if (!id || !primeira || fimDaAberta.value || carregandoAberta.value) return 0
    carregandoAberta.value = true
    try {
      const anteriores = await api.getMensagensDaPasta(id, primeira.id)
      if (abertaId.value !== id) return 0
      const atuais = new Set(mensagensDaAberta.value.map((m) => m.id))
      const novas = anteriores.filter((m) => !atuais.has(m.id))
      mensagensDaAberta.value = [...novas, ...mensagensDaAberta.value]
      fimDaAberta.value = anteriores.length < 50
      return novas.length
    } finally {
      carregandoAberta.value = false
    }
  }

  function fecharPasta() {
    abertaId.value = null
    mensagensDaAberta.value = []
    fimDaAberta.value = false
  }

  // Aviso do servidor (WebSocket tipo 67): outra aba ou a outra pessoa mexeu
  async function aoAviso(evento: AvisoPasta) {
    if (!evento.conversa_id || evento.conversa_id !== conversaId.value) return
    if (evento.pasta_id && evento.mensagens?.length && evento.acao) marcarNasBolhas(evento.pasta_id, evento.mensagens, evento.acao)
    await carregar()
    if (evento.pasta_id && evento.pasta_id === abertaId.value && evento.acao) await recarregarAberta()
  }

  return {
    conversaId,
    lista,
    porId,
    painelAberto,
    selecionadas,
    idsSelecionados,
    arrastando,
    abertaId,
    aberta,
    mensagensDaAberta,
    carregandoAberta,
    fimDaAberta,
    usarConversa,
    carregar,
    criar,
    alterar,
    excluir,
    porMensagens,
    tirarMensagens,
    selecionar,
    alternarSelecao,
    limparSelecao,
    abrirPasta,
    carregarAnteriores,
    fecharPasta,
    aoAviso,
  }
})
