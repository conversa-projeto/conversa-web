import { ref } from 'vue'

/**
 * Ref reativa global com o timestamp atual, atualizada a cada 30s.
 * Usada por componentes que precisam reagir a mudancas de tempo
 * (ex: badge "Agendada para..." que some quando a mensagem amadurece).
 *
 * Uma unica interval compartilhada entre todos os consumidores.
 * Nao precisa cleanup: o interval vive enquanto a app estiver aberta.
 */
const agora = ref(Date.now())
let timer: number | null = null

function iniciar() {
  if (timer !== null) return
  timer = window.setInterval(() => {
    agora.value = Date.now()
  }, 30_000)
}

export function useAgora() {
  iniciar()
  return agora
}
