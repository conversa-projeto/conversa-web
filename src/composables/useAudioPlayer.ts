import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
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
  duracao?: number | null
}

export { formatarDuracao }

export function useAudioPlayer(props: AudioPlayerProps) {
  const audioRef = ref<HTMLAudioElement | null>(null)
  const barraRef = ref<HTMLElement | null>(null)
  const tocando = ref(false)
  const carregando = ref(false)
  // A gravada no envio já serve antes de baixar o áudio
  const duracaoTotal = ref<number | null>(props.duracao ?? null)
  const tempoAtual = ref(0)
  const srcCarregado = ref(false)
  const reproduzidaMarcada = ref(props.reproduzida ?? false)
  // Pulando para o fim para descobrir a duração: tempo e fim não contam
  let medindo = false

  const naoReproduzida = computed(() => !reproduzidaMarcada.value && !props.isOwn)

  const progresso = computed(() => {
    if (!duracaoTotal.value || duracaoTotal.value <= 0) return 0
    return Math.min(100, (tempoAtual.value / duracaoTotal.value) * 100)
  })

  // Um pedido só, mesmo com o play clicado enquanto a duração é buscada
  let pedidoSrc: Promise<boolean> | null = null

  function carregarSrc(silencioso = false): Promise<boolean> {
    pedidoSrc ??= definirSrc(silencioso).then((ok) => {
      if (!ok) pedidoSrc = null
      return ok
    })
    return pedidoSrc
  }

  async function definirSrc(silencioso: boolean): Promise<boolean> {
    const el = audioRef.value
    if (!el) return false
    if (srcCarregado.value) return true
    // Com o src definido, já carrega a duração (o template usa preload="none")
    el.preload = 'metadata'
    if (props.src) {
      el.src = props.src
    } else if (props.identificador) {
      if (!silencioso) carregando.value = true
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
      await medirDuracao(el)
      registrarAudio(el)
      el.play()
      if (!reproduzidaMarcada.value && props.conversaId && props.mensagemId && props.mensagemId > 0) {
        reproduzidaMarcada.value = true
        mensagemReproduzir(props.conversaId, props.mensagemId).catch(() => {})
      }
    }
  }

  // Gravação do navegador (WebM em pedaços) não traz a duração no arquivo: num
  // áudio maior o navegador só baixa o começo e a duração fica Infinity. Pulando
  // para o fim, ele lê até lá e descobre; depois volta ao começo.
  // Mesmo com a duração gravada no envio: sem ela no elemento, não dá para
  // pular para um ponto da barra.
  let medicao: Promise<void> | null = null

  function medirDuracao(el: HTMLAudioElement, silencioso = false): Promise<void> {
    medicao ??= medir(el, silencioso).finally(() => { medicao = null })
    return medicao
  }

  async function medir(el: HTMLAudioElement, silencioso: boolean) {
    if (el.readyState < HTMLMediaElement.HAVE_METADATA) await esperarEvento(el, 'loadedmetadata')
    if (Number.isFinite(el.duration)) {
      duracaoTotal.value ??= el.duration
      return
    }
    medindo = true
    if (!silencioso) carregando.value = true
    try {
      const descobriu = esperarEvento(el, 'durationchange', () => Number.isFinite(el.duration))
      el.currentTime = 1e101
      await descobriu
      if (Number.isFinite(el.duration)) duracaoTotal.value ??= el.duration
      el.currentTime = 0
    } finally {
      medindo = false
      carregando.value = false
    }
  }

  // Espera o evento (e a condição, se houver); desiste em 10 s para o play não travar
  function esperarEvento(el: HTMLAudioElement, evento: string, pronto: () => boolean = () => true) {
    return new Promise<void>((resolve) => {
      const terminar = () => {
        window.clearTimeout(limite)
        el.removeEventListener(evento, aoEvento)
        resolve()
      }
      const aoEvento = () => { if (pronto()) terminar() }
      const limite = window.setTimeout(terminar, 10_000)
      el.addEventListener(evento, aoEvento)
    })
  }

  function onMetadata() {
    const el = audioRef.value
    // A gravada no envio prevalece: o total não muda ao começar a tocar
    if (el && Number.isFinite(el.duration)) {
      duracaoTotal.value ??= el.duration
    }
  }

  function onTimeUpdate() {
    const el = audioRef.value
    if (el && !medindo) {
      tempoAtual.value = el.currentTime
      if (!duracaoTotal.value && Number.isFinite(el.duration)) {
        duracaoTotal.value = el.duration
      }
    }
  }

  function onEnded() {
    if (medindo) return
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

  // Áudio sem a duração gravada (enviado antes de ela ser gravada): busca só a
  // duração quando o player aparece na tela, sem tocar nem mostrar carregando
  let observador: IntersectionObserver | null = null

  onMounted(() => {
    const raiz = audioRef.value?.parentElement
    if (duracaoTotal.value || !raiz || (!props.src && !props.identificador) || typeof IntersectionObserver === 'undefined') return
    observador = new IntersectionObserver((entradas) => {
      if (!entradas.some((entrada) => entrada.isIntersecting)) return
      observador?.disconnect()
      observador = null
      void (async () => {
        const el = audioRef.value
        if (el && !duracaoTotal.value && await carregarSrc(true)) await medirDuracao(el, true)
      })()
    }, { rootMargin: '200px' })
    observador.observe(raiz)
  })

  onBeforeUnmount(() => {
    observador?.disconnect()
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
