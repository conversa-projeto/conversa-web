<template>
  <div ref="caixa" class="relative bg-black" :class="ajustarAoVideo ? '' : 'h-full w-full'" @mousemove="mexeu">
    <video
      ref="video"
      :src="src"
      playsinline
      preload="metadata"
      :autoplay="completo"
      :class="ajustarAoVideo ? classeVideo : 'h-full w-full object-contain'"
      @click="cliqueNoVideo"
      @play="tocando = true"
      @pause="tocando = false; mexeu()"
      @timeupdate="atual = ($event.target as HTMLVideoElement).currentTime"
      @loadedmetadata="lerDuracao"
      @durationchange="lerDuracao"
      @loadeddata="emit('carregado')"
      @error="emit('erro')"
    />
    <button
      v-if="!tocando"
      type="button"
      class="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      title="Reproduzir vídeo"
      @click="cliqueNoVideo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-7 w-7">
        <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
      </svg>
    </button>
    <div
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-1.5 pt-6 text-white transition-opacity"
      :class="barraVisivel ? 'opacity-100' : 'pointer-events-none opacity-0'"
    >
      <div
        ref="barra"
        class="relative flex h-4 cursor-pointer touch-none items-center"
        @pointerdown="comecarArrastar"
        @pointermove="arrastando && irPara($event)"
        @pointerup="arrastando = false"
        @pointercancel="arrastando = false"
      >
        <div class="h-1 w-full overflow-hidden rounded-full bg-white/30">
          <div class="h-full bg-white" :style="{ width: `${progresso}%` }"></div>
        </div>
        <div class="absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white" :style="{ left: `${progresso}%` }"></div>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15" :title="tocando ? 'Pausar' : 'Reproduzir'" @click="alternar">
          <svg v-if="tocando" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" /></svg>
        </button>
        <span class="text-xs tabular-nums">{{ formatarDuracao(atual) }} / {{ formatarDuracao(duracao) }}</span>
        <span class="flex-1"></span>
        <!-- Volume (só no visualizador): de 0 a 200%; acima de 100% a barra fica vermelha -->
        <div v-if="completo" class="flex items-center gap-1">
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15" :title="volumeExibido === 0 ? 'Ativar som' : 'Silenciar'" @click="alternarMudo">
            <svg v-if="volumeExibido === 0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
          </button>
          <div
            ref="barraVolume"
            class="relative flex h-4 w-24 cursor-pointer touch-none items-center"
            title="Volume"
            @pointerdown="comecarVolume"
            @pointermove="arrastandoVolume && mudarVolume($event)"
            @pointerup="arrastandoVolume = false"
            @pointercancel="arrastandoVolume = false"
          >
            <div class="relative h-1 w-full overflow-hidden rounded-full bg-white/30">
              <div class="absolute inset-y-0 left-0 bg-white" :style="{ width: `${Math.min(volumeExibido, 1) * 50}%` }"></div>
              <div v-if="volumeExibido > 1" class="absolute inset-y-0 left-1/2 bg-red-500" :style="{ width: `${(volumeExibido - 1) * 50}%` }"></div>
            </div>
            <div class="absolute left-1/2 h-2 w-px bg-white/60"></div>
            <div class="absolute h-3 w-3 -translate-x-1/2 rounded-full" :class="volumeExibido > 1 ? 'bg-red-500' : 'bg-white'" :style="{ left: `${volumeExibido * 50}%` }"></div>
          </div>
          <span class="w-9 text-right text-xs tabular-nums" :class="volumeExibido > 1 ? 'text-red-400' : ''">{{ Math.round(volumeExibido * 100) }}%</span>
        </div>
        <!-- Velocidade (só no visualizador) -->
        <div v-if="completo" class="relative">
          <button type="button" class="flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-medium tabular-nums hover:bg-white/15" title="Velocidade" @click="menuVelocidade = !menuVelocidade">
            {{ rotuloVelocidade(velocidade) }}
          </button>
          <div v-if="menuVelocidade" class="absolute bottom-full right-0 mb-2 flex flex-col rounded-lg bg-black/90 py-1 text-xs shadow-lg">
            <button
              v-for="v in VELOCIDADES"
              :key="v"
              type="button"
              class="px-4 py-1 text-left tabular-nums hover:bg-white/15"
              :class="v === velocidade ? 'font-semibold text-white' : 'text-white/70'"
              @click="escolherVelocidade(v)"
            >
              {{ rotuloVelocidade(v) }}
            </button>
          </div>
        </div>
        <button v-if="enviado" type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15" title="Baixar vídeo" @click="emit('baixar')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
        </button>
        <button v-if="enviado && !completo" type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15" title="Abrir no visualizador" @click="expandir">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
        </button>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15" :title="telaCheia ? 'Sair da tela cheia' : 'Tela cheia'" @click="alternarTelaCheia">
          <svg v-if="telaCheia" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatarDuracao } from '../utils/formatters'

// completo: o player do visualizador, com volume, velocidade e o tamanho do próprio vídeo (classeVideo)
const props = defineProps<{
  src: string
  enviado: boolean
  completo?: boolean
  classeVideo?: string
}>()

const emit = defineEmits<{
  expandir: []
  baixar: []
  carregado: []
  erro: []
}>()

const VELOCIDADES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]

const caixa = ref<HTMLElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const barra = ref<HTMLElement | null>(null)
const barraVolume = ref<HTMLElement | null>(null)
const tocando = ref(false)
const atual = ref(0)
const duracao = ref<number | null>(null)
const mostrar = ref(false)
const arrastando = ref(false)
const arrastandoVolume = ref(false)
const telaCheia = ref(false)
const volume = ref(1)
const mudo = ref(false)
const velocidade = ref(1)
const menuVelocidade = ref(false)
let timerOcultar: ReturnType<typeof setTimeout> | undefined
let timerClique: ReturnType<typeof setTimeout> | undefined
// Acima de 100% o som passa por um ganho do Web Audio (o volume do <video> vai só até 1)
let amplificador: { contexto: AudioContext; ganho: GainNode } | null = null

// A barra só aparece com o mouse sobre o vídeo e some depois de um tempo sem mexer, tocando ou pausado
const barraVisivel = computed(() => mostrar.value || arrastando.value || arrastandoVolume.value || menuVelocidade.value)
const progresso = computed(() => (duracao.value ? Math.min(100, (atual.value / duracao.value) * 100) : 0))
const volumeExibido = computed(() => (mudo.value ? 0 : volume.value))
const ajustarAoVideo = computed(() => !!props.classeVideo && !telaCheia.value)

function rotuloVelocidade(v: number) {
  return `${String(v).replace('.', ',')}x`
}

function lerDuracao() {
  const d = video.value?.duration
  duracao.value = d && Number.isFinite(d) ? d : null
}

function alternar() {
  const v = video.value
  if (!v) return
  if (v.paused) void v.play()
  else v.pause()
}

// Um clique toca ou pausa; dois cliques rápidos entram ou saem da tela cheia
function cliqueNoVideo() {
  if (timerClique) {
    clearTimeout(timerClique)
    timerClique = undefined
    alternarTelaCheia()
    return
  }
  timerClique = setTimeout(() => {
    timerClique = undefined
    alternar()
  }, 250)
}

function mexeu() {
  mostrar.value = true
  clearTimeout(timerOcultar)
  timerOcultar = setTimeout(() => { mostrar.value = false }, 2500)
}

function fracaoNaBarra(evento: PointerEvent, elemento: HTMLElement | null) {
  const caixaBarra = elemento?.getBoundingClientRect()
  if (!caixaBarra?.width) return null
  return Math.min(1, Math.max(0, (evento.clientX - caixaBarra.left) / caixaBarra.width))
}

function irPara(evento: PointerEvent) {
  const v = video.value
  const fracao = fracaoNaBarra(evento, barra.value)
  if (!v || fracao === null || !duracao.value) return
  v.currentTime = fracao * duracao.value
  atual.value = v.currentTime
}

function comecarArrastar(evento: PointerEvent) {
  arrastando.value = true
  ;(evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId)
  irPara(evento)
}

function aplicarVolume() {
  const v = video.value
  if (!v) return
  v.muted = mudo.value
  v.volume = Math.min(1, volume.value)
  if (volume.value > 1 && !amplificador) {
    const contexto = new AudioContext()
    const ganho = contexto.createGain()
    contexto.createMediaElementSource(v).connect(ganho).connect(contexto.destination)
    amplificador = { contexto, ganho }
  }
  if (amplificador) {
    amplificador.ganho.gain.value = Math.max(1, volume.value)
    void amplificador.contexto.resume()
  }
}

function mudarVolume(evento: PointerEvent) {
  const fracao = fracaoNaBarra(evento, barraVolume.value)
  if (fracao === null) return
  volume.value = Math.round(fracao * 40) / 20
  mudo.value = volume.value === 0
  aplicarVolume()
}

function comecarVolume(evento: PointerEvent) {
  arrastandoVolume.value = true
  ;(evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId)
  mudarVolume(evento)
}

function alternarMudo() {
  if (mudo.value || volume.value === 0) {
    mudo.value = false
    if (volume.value === 0) volume.value = 1
  } else {
    mudo.value = true
  }
  aplicarVolume()
}

function escolherVelocidade(v: number) {
  velocidade.value = v
  menuVelocidade.value = false
  if (video.value) video.value.playbackRate = v
}

function expandir() {
  video.value?.pause()
  emit('expandir')
}

function alternarTelaCheia() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void caixa.value?.requestFullscreen()
}

function aoMudarTelaCheia() {
  telaCheia.value = document.fullscreenElement === caixa.value
}

onMounted(() => document.addEventListener('fullscreenchange', aoMudarTelaCheia))

onBeforeUnmount(() => {
  clearTimeout(timerOcultar)
  clearTimeout(timerClique)
  document.removeEventListener('fullscreenchange', aoMudarTelaCheia)
  void amplificador?.contexto.close()
})
</script>
