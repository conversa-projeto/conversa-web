import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/conversaApi'
import type { Atividade } from '../types/api'

const POR_PAGINA = 30

// Atividades do usuário (reagiram, responderam, mencionaram, chamada perdida,
// pediram confirmação de leitura) e quantas estão pendentes
export const useAtividadesStore = defineStore('atividades', () => {
  const lista = ref<Atividade[]>([])
  // Pendentes (o número na barra)
  const novas = ref(0)
  const carregando = ref(false)
  const fim = ref(false)
  // A tela está aberta: o que chegar já entra na lista
  const aberta = ref(false)

  async function atualizarNovas() {
    try {
      novas.value = (await api.getAtividadesNovas()).quantidade
    } catch {
      // O contador volta a ser lido no próximo aviso ou reconexão
    }
  }

  async function carregar() {
    carregando.value = true
    try {
      const itens = await api.getAtividades(0, POR_PAGINA)
      lista.value = itens
      fim.value = itens.length < POR_PAGINA
    } finally {
      carregando.value = false
    }
  }

  async function carregarMais() {
    const ultima = lista.value.at(-1)
    if (fim.value || carregando.value || !ultima) return
    carregando.value = true
    try {
      const itens = await api.getAtividades(ultima.id, POR_PAGINA)
      lista.value = [...lista.value, ...itens]
      fim.value = itens.length < POR_PAGINA
    } finally {
      carregando.value = false
    }
  }

  // À mão, ou ao abrir a chamada perdida; o aviso do servidor acerta o número nas outras abas
  async function concluir(id: number) {
    const atividade = lista.value.find((a) => a.id === id)
    if (!atividade?.pendente) return
    await api.concluirAtividade(id)
    atividade.pendente = false
    novas.value = Math.max(0, novas.value - 1)
  }

  async function abrir() {
    aberta.value = true
    await Promise.all([carregar(), atualizarNovas()])
  }

  function fechar() {
    aberta.value = false
  }

  // Aviso do servidor: com a tela aberta, recarrega a lista também
  async function aoReceberAviso() {
    if (aberta.value) {
      await abrir()
    } else {
      await atualizarNovas()
    }
  }

  function limpar() {
    lista.value = []
    novas.value = 0
    fim.value = false
    aberta.value = false
  }

  return { lista, novas, carregando, fim, aberta, atualizarNovas, carregar, carregarMais, concluir, abrir, fechar, aoReceberAviso, limpar }
})
