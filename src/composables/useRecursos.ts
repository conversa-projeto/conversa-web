import { readonly, ref } from 'vue'
import { getRecursos } from '../services/conversaApi'

// O que está ligado no servidor (transcrição de áudio, IA). Carregado uma vez
// por janela, no primeiro uso; recarregar() depois de mudar os parâmetros.
const recursos = ref({ transcricao: false, ia: false })
let carregamento: Promise<void> | null = null

function recarregar() {
  carregamento = getRecursos()
    .then((r) => { recursos.value = r })
    .catch(() => { carregamento = null })
  return carregamento
}

export function useRecursos() {
  if (!carregamento) void recarregar()
  return { recursos: readonly(recursos), recarregar }
}
