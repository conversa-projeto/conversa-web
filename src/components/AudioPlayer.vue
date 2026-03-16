<template>
  <div class="w-64 max-w-full pt-1.5">
    <div class="flex items-center gap-2">
      <button
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition"
        :class="[
          isOwn ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
          naoReproduzida ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
        ]"
        :disabled="carregando"
        @click="alternarReproducao"
      >
        <svg v-if="carregando" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 animate-spin">
          <path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2Z" />
        </svg>
        <svg v-else-if="tocando" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
        </svg>
      </button>

      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span v-if="props.mostrarNome !== false" class="truncate text-[11px]" :class="isOwn ? 'text-blue-200' : 'text-slate-400'" :title="nome">
          {{ nome }}
        </span>
        <div class="flex items-center gap-2">
          <div
            ref="barraRef"
            class="relative h-1.5 min-w-0 flex-1 cursor-pointer rounded-full"
            :class="isOwn ? 'bg-blue-400/50' : 'bg-slate-200'"
            @pointerdown="iniciarSeek"
          >
            <div
              class="absolute inset-y-0 left-0 rounded-full"
              :class="isOwn ? 'bg-white' : 'bg-blue-500'"
              :style="{ width: progresso + '%' }"
            />
          </div>
          <span class="shrink-0 text-[10px] tabular-nums" :class="isOwn ? 'text-blue-100' : 'text-slate-500'">
            {{ formatarDuracao(tempoAtual) }} / {{ formatarDuracao(duracaoTotal) }}
          </span>
        </div>
      </div>
    </div>

    <audio
      ref="audioRef"
      preload="none"
      @loadedmetadata="onMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @play="onPlay"
      @pause="onPause"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { formatarDuracao } from '../utils/formatters'
import { registrarAudio, desregistrarAudio } from '../composables/useAudioManager'
import { getAnexoUrl, mensagemReproduzir } from '../services/conversaApi'

const props = defineProps<{
  src?: string
  identificador?: string
  conversaId?: number
  mensagemId?: number
  reproduzida?: boolean
  nome: string
  isOwn?: boolean
  mostrarNome?: boolean
}>()

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
</script>
