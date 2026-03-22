import { ref, computed, onUnmounted } from 'vue'

type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g'

interface NetworkInformation extends EventTarget {
  effectiveType: EffectiveType
}

const tiposLentos: EffectiveType[] = ['slow-2g', '2g']

const efetivo = ref<EffectiveType | null>(null)

function atualizar() {
  const conn = (navigator as unknown as { connection?: NetworkInformation }).connection
  if (conn) efetivo.value = conn.effectiveType
}

// Inicializa e escuta mudanças (singleton)
let inicializado = false

function inicializar() {
  if (inicializado) return
  inicializado = true
  const conn = (navigator as unknown as { connection?: NetworkInformation }).connection
  if (!conn) return
  efetivo.value = conn.effectiveType
  conn.addEventListener('change', atualizar)
}

inicializar()

export function useConexao() {
  const conexaoLenta = computed(() => {
    if (!efetivo.value) return false // API não disponível → fallback otimista
    return tiposLentos.includes(efetivo.value)
  })

  return { conexaoLenta }
}
