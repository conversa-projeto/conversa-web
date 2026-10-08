import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/conversaApi'
import type { Enquete } from '../types/api'

// Votações já abertas na tela. A mensagem leva só o id; os votos vêm daqui e
// são lidos de novo quando o servidor avisa que alguém votou.
export const useEnquetesStore = defineStore('enquetes', () => {
  const porId = ref<Record<number, Enquete>>({})
  const lendo = new Map<number, Promise<void>>()

  function carregar(id: number, forcar = false): Promise<void> {
    const emAndamento = lendo.get(id)
    if (emAndamento) return emAndamento
    if (!forcar && porId.value[id]) return Promise.resolve()
    const leitura = api.getEnquete(id)
      .then((enquete) => { porId.value[id] = enquete })
      .finally(() => lendo.delete(id))
    lendo.set(id, leitura)
    return leitura
  }

  // O voto passa a ser exatamente estas opções (vazio tira o voto)
  async function votar(id: number, opcoes: number[]) {
    porId.value[id] = await api.votarEnquete(id, opcoes)
  }

  async function encerrar(id: number) {
    porId.value[id] = await api.encerrarEnquete(id)
  }

  async function alterarPrazo(id: number, encerraEm: Date | null) {
    porId.value[id] = await api.alterarPrazoEnquete(id, encerraEm)
  }

  // Aviso do servidor: só relê as que estão na tela
  function aoAtualizar(id: number) {
    if (porId.value[id]) void carregar(id, true).catch(() => { /* fica o resultado anterior */ })
  }

  return { porId, carregar, votar, encerrar, alterarPrazo, aoAtualizar }
})
