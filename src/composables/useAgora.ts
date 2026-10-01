import { ref, watch } from 'vue'

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

// Maior espera aceita pelo setTimeout (cerca de 24 dias)
const ESPERA_MAXIMA = 2 ** 31 - 1
const agendados = new Set<number>()

// Atualiza o agora no momento pedido, sem esperar o próximo ciclo de 30s.
// Momento que já passou atualiza logo: o agora pode estar até 30s atrasado.
function atualizarEm(momento: number) {
  if (agendados.has(momento)) return
  agendados.add(momento)
  const esperar = () => {
    const falta = momento - Date.now()
    if (falta > 0) {
      window.setTimeout(esperar, Math.min(falta, ESPERA_MAXIMA))
      return
    }
    agendados.delete(momento)
    agora.value = Date.now()
  }
  esperar()
}

// momento: quando o componente precisa do agora em dia (ex.: a hora em que
// a mensagem agendada fica visível)
export function useAgora(momento?: () => Date | null | undefined) {
  iniciar()
  if (momento) {
    watch(momento, (valor) => {
      if (valor) atualizarEm(new Date(valor).getTime())
    }, { immediate: true })
  }
  return agora
}
