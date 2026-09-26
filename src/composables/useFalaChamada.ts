import { onBeforeUnmount, shallowRef } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useCallStore } from '../stores/call'

// Volume (RMS) a partir do qual o som conta como fala, e quanto tempo a pessoa
// continua marcada depois de parar, para o indicador nao piscar entre as palavras.
const LIMIAR = 0.02
const SEGURA_MS = 400
const INTERVALO_MS = 100

interface Medidor {
  trilhaId: string
  fonte: MediaStreamAudioSourceNode
  analisador: AnalyserNode
  ultimaFala: number
}

function mesmoConjunto(a: ReadonlySet<number>, b: ReadonlySet<number>) {
  return a.size === b.size && [...a].every((id) => b.has(id))
}

// Quem esta falando na chamada agora: o proprio usuario (microfone) e cada
// participante (audio recebido), medidos pelo volume a cada 100 ms. Vale
// enquanto o componente que usa estiver montado.
export function useFalaChamada() {
  const call = useCallStore()
  const auth = useAuthStore()
  const falando = shallowRef<ReadonlySet<number>>(new Set())

  let contexto: AudioContext | null = null
  const medidores = new Map<number, Medidor>()
  const amostra = new Float32Array(1024)

  function remover(usuarioId: number) {
    medidores.get(usuarioId)?.fonte.disconnect()
    medidores.delete(usuarioId)
  }

  // Mede a trilha de audio atual da pessoa. A trilha muda ao reabrir o
  // microfone ou reconectar, e o audio recebido pode chegar depois do video.
  function medir(usuarioId: number, stream: MediaStream | null) {
    const trilha = stream?.getAudioTracks()[0]
    if (medidores.get(usuarioId)?.trilhaId === trilha?.id) return
    remover(usuarioId)
    if (!trilha) return
    contexto ??= new AudioContext()
    const fonte = contexto.createMediaStreamSource(new MediaStream([trilha]))
    const analisador = contexto.createAnalyser()
    analisador.fftSize = amostra.length
    fonte.connect(analisador)
    medidores.set(usuarioId, { trilhaId: trilha.id, fonte, analisador, ultimaFala: 0 })
  }

  function atualizarMedidores() {
    const presentes = new Set<number>()
    const eu = auth.user?.id
    if (eu) {
      medir(eu, call.streamLocal)
      presentes.add(eu)
    }
    for (const [usuarioId, peer] of call.peers) {
      medir(usuarioId, peer.stream)
      presentes.add(usuarioId)
    }
    for (const usuarioId of [...medidores.keys()]) {
      if (!presentes.has(usuarioId)) remover(usuarioId)
    }
  }

  function verificar() {
    atualizarMedidores()
    if (contexto?.state === 'suspended') void contexto.resume()

    const agora = performance.now()
    const atuais = new Set<number>()
    for (const [usuarioId, medidor] of medidores) {
      medidor.analisador.getFloatTimeDomainData(amostra)
      let soma = 0
      for (const valor of amostra) soma += valor * valor
      if (Math.sqrt(soma / amostra.length) > LIMIAR) medidor.ultimaFala = agora
      if (agora - medidor.ultimaFala < SEGURA_MS) atuais.add(usuarioId)
    }
    // Microfone mutado nao conta, mesmo com ruido residual
    if (call.micMutado && auth.user) atuais.delete(auth.user.id)

    if (!mesmoConjunto(atuais, falando.value)) falando.value = atuais
  }

  const intervalo = setInterval(verificar, INTERVALO_MS)

  onBeforeUnmount(() => {
    clearInterval(intervalo)
    for (const usuarioId of [...medidores.keys()]) remover(usuarioId)
    void contexto?.close()
  })

  return { falando }
}
