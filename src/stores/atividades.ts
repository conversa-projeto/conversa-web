import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/conversaApi'
import type { Atividade } from '../types/api'

const POR_PAGINA = 30

// Atividades do usuário (reagiram, responderam, mencionaram, chamada perdida)
// e quantas chegaram desde a última vez que ele abriu a tela
export const useAtividadesStore = defineStore('atividades', () => {
  const lista = ref<Atividade[]>([])
  const novas = ref(0)
  const carregando = ref(false)
  const fim = ref(false)
  // A tela está aberta: o que chegar já entra como visto
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

  // As da lista continuam destacadas como novas enquanto a tela está aberta
  async function marcarVistas() {
    await api.marcarAtividadesVistas()
    novas.value = 0
  }

  async function abrir() {
    aberta.value = true
    await carregar()
    await marcarVistas()
  }

  function fechar() {
    aberta.value = false
  }

  // Aviso do servidor: com a tela aberta, recarrega e marca como visto;
  // fechada, só atualiza o contador
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

  return { lista, novas, carregando, fim, aberta, atualizarNovas, carregar, carregarMais, marcarVistas, abrir, fechar, aoReceberAviso, limpar }
})
