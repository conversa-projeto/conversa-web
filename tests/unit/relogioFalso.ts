// Relógio falso para timers (setTimeout e setInterval de window): o teste avança
// o tempo na mão, sem esperar de verdade. Date.now também anda junto.
interface Timer {
  id: number
  quando: number
  intervalo: number | null
  executar: () => void
}

export function relogioFalso() {
  const original = {
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    now: Date.now,
  }
  let agora = original.now()
  let proximoId = 1
  const timers = new Map<number, Timer>()

  const agendar = (executar: () => void, ms = 0, intervalo: number | null = null) => {
    const id = proximoId++
    timers.set(id, { id, quando: agora + Math.max(0, ms), intervalo, executar })
    return id
  }
  const cancelar = (id?: number) => void (id !== undefined && timers.delete(id))

  window.setTimeout = ((executar: () => void, ms?: number) => agendar(executar, ms)) as typeof window.setTimeout
  window.clearTimeout = cancelar as typeof window.clearTimeout
  window.setInterval = ((executar: () => void, ms?: number) => agendar(executar, ms, ms ?? 0)) as typeof window.setInterval
  window.clearInterval = cancelar as typeof window.clearInterval
  Date.now = () => agora

  return {
    // Avança o tempo, disparando na ordem os timers que vencerem
    avancar(ms: number) {
      const fim = agora + ms
      for (;;) {
        const proximo = [...timers.values()].filter((t) => t.quando <= fim).sort((a, b) => a.quando - b.quando)[0]
        if (!proximo) break
        agora = proximo.quando
        if (proximo.intervalo !== null) proximo.quando += Math.max(1, proximo.intervalo)
        else timers.delete(proximo.id)
        proximo.executar()
      }
      agora = fim
    },
    // Roda uma ação que espera timers (retentativas, por exemplo), avançando o
    // tempo aos poucos até ela terminar
    async rodar<T>(acao: Promise<T>, passo = 500, limite = 120_000): Promise<T> {
      let terminou = false
      const resultado = acao.finally(() => { terminou = true })
      for (let total = 0; !terminou && total < limite; total += passo) {
        for (let i = 0; i < 5; i++) await Bun.sleep(0)
        if (!terminou) this.avancar(passo)
      }
      return resultado
    },
    pendentes: () => timers.size,
    restaurar() {
      Object.assign(window, { setTimeout: original.setTimeout, clearTimeout: original.clearTimeout, setInterval: original.setInterval, clearInterval: original.clearInterval })
      Date.now = original.now
    },
  }
}
