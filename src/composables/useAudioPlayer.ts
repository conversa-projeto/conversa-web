import { ref, computed, onBeforeUnmount } from 'vue'
import { formatarDuracao } from '../utils/formatters'
import { registrarAudio, desregistrarAudio } from './useAudioManager'
import { getAnexoUrl, mensagemReproduzir } from '../services/conversaApi'

export interface AudioPlayerProps {
  src?: string
  identificador?: string
  conversaId?: number
  mensagemId?: number
  reproduzida?: boolean
  isOwn?: boolean
}

export { formatarDuracao }

export function useAudioPlayer(props: AudioPlayerProps) {
  const audioRef = ref<HTMLAudioElement | null>(null)
  const barraRef = ref<HTMLElement | null>(null)
  const tocando = ref(false)
  const carregando = ref(false)
  const duracaoTotal = ref<number | null>(null)
  const tempoAtual = ref(0)
  const srcCarregado = ref(false)
  const reproduzidaMarcada = ref(props.reproduzida ?? false)

  const naoReproduzida = computed(() => !reproduzidaMarcada.value && !props.isOwn)

  const progresso = computed(() => {
    if (!duracaoTotal.value || duracaoTotal.value <= 0) return 0
    return Math.min(100, (tempoAtual.value / duracaoTotal.value) * 100)
  })

  async function carregarSrc(): Promise<boolean> {
    const el = audioRef.value
    if (!el) return false
    if (srcCarregado.value) return true
    if (props.src) {
      el.src = props.src
    } else if (props.identificador) {
      carregando.value = true
      try {
        const url = await getAnexoUrl(props.identificador)
        el.src = url
      } catch {
        carregando.value = false
        return false
      }
    } else {
      return false
    }
    srcCarregado.value = true
    carregando.value = false
    return true
  }

  async function alternarReproducao() {
    const el = audioRef.value
    if (!el || carregando.value) return
    if (tocando.value) {
      el.pause()
    } else {
      if (!await carregarSrc()) return
      registrarAudio(el)
      el.play()
      if (!reproduzidaMarcada.value && props.conversaId && props.mensagemId && props.mensagemId > 0) {
        reproduzidaMarcada.value = true
        mensagemReproduzir(props.conversaId, props.mensagemId).catch(() => {})
      }
    }
  }

  function onMetadata() {
    const el = audioRef.value
    if (el && Number.isFinite(el.duration)) {
      duracaoTotal.value = el.duration
    }
  }

  function onTimeUpdate() {
    const el = audioRef.value
    if (el) {
      tempoAtual.value = el.currentTime
      if (!duracaoTotal.value && Number.isFinite(el.duration)) {
        duracaoTotal.value = el.duration
      }
    }
  }

  function onEnded() {
    tocando.value = false
    tempoAtual.value = 0
  }

  function onPlay() {
    tocando.value = true
  }

  function onPause() {
    tocando.value = false
  }

  function iniciarSeek(e: PointerEvent) {
    const barra = barraRef.value
    const el = audioRef.value
    if (!barra || !el || !srcCarregado.value || !Number.isFinite(el.duration)) return

    const aplicarSeek = (ev: PointerEvent) => {
      const rect = barra.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      el.currentTime = ratio * el.duration
    }

    aplicarSeek(e)
    barra.setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent) => aplicarSeek(ev)
    const onUp = () => {
      barra.removeEventListener('pointermove', onMove)
      barra.removeEventListener('pointerup', onUp)
    }

    barra.addEventListener('pointermove', onMove)
    barra.addEventListener('pointerup', onUp)
  }

  onBeforeUnmount(() => {
    const el = audioRef.value
    if (el) {
      el.pause()
      desregistrarAudio(el)
    }
  })

  return {
    audioRef,
    barraRef,
    tocando,
    carregando,
    duracaoTotal,
    tempoAtual,
    progresso,
    naoReproduzida,
    alternarReproducao,
    iniciarSeek,
    onMetadata,
    onTimeUpdate,
    onEnded,
    onPlay,
    onPause
  }
}
