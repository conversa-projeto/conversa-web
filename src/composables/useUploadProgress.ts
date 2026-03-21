import { ref, computed, readonly } from 'vue'

export interface UploadAtivo {
  id: string
  nomeArquivo: string
  progresso: number
}

const uploadsAtivos = ref<UploadAtivo[]>([])
const indicadorVisivel = ref(false)
let timerVisibilidade: ReturnType<typeof setTimeout> | null = null

function avaliarVisibilidade() {
  const temAtivo = uploadsAtivos.value.length > 0
  if (!temAtivo) {
    indicadorVisivel.value = false
    if (timerVisibilidade) { clearTimeout(timerVisibilidade); timerVisibilidade = null }
    return
  }
  // Se já visível, manter
  if (indicadorVisivel.value) return
  // Agendar exibição após 2s se ainda não atingiu 50%
  if (!timerVisibilidade) {
    timerVisibilidade = setTimeout(() => {
      timerVisibilidade = null
      const lento = uploadsAtivos.value.some(u => u.progresso < 50)
      if (lento) indicadorVisivel.value = true
    }, 2000)
  }
}

export function useUploadProgress() {
  const temUploadAtivo = computed(() => uploadsAtivos.value.length > 0)
  const mostrarIndicador = computed(() => indicadorVisivel.value && uploadsAtivos.value.length > 0)

  function iniciarUpload(id: string, nomeArquivo: string): (percent: number) => void {
    uploadsAtivos.value.push({ id, nomeArquivo, progresso: 0 })
    avaliarVisibilidade()
    return (percent: number) => {
      const item = uploadsAtivos.value.find(u => u.id === id)
      if (item) item.progresso = percent
    }
  }

  function finalizarUpload(id: string) {
    uploadsAtivos.value = uploadsAtivos.value.filter(u => u.id !== id)
    avaliarVisibilidade()
  }

  function limparTodos() {
    uploadsAtivos.value = []
    indicadorVisivel.value = false
    if (timerVisibilidade) { clearTimeout(timerVisibilidade); timerVisibilidade = null }
  }

  return {
    uploadsAtivos: readonly(uploadsAtivos),
    temUploadAtivo,
    mostrarIndicador,
    iniciarUpload,
    finalizarUpload,
    limparTodos
  }
}
