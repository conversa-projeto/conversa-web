<template>
  <video ref="video" v-src-object="stream" autoplay playsinline muted class="h-full w-full object-contain"></video>
  <!-- Sem quadro ainda (ou a transmissão parou de chegar): em vez da tela cinza -->
  <div
    v-if="!temQuadro"
    role="status"
    class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-chamada-800 text-surface-300"
  >
    <svg class="h-5 w-5 shrink-0 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
    <span class="text-xs">Conectando o vídeo...</span>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { vSrcObject } from '@/directives/vSrcObject'

// Vídeo de um participante, com o aviso de conectando até o primeiro quadro.
// tela: o participante avisou que compartilha a tela; quando ela aparece aqui,
// emite telaVista (para quem compartilha saber que já está sendo vista)
const props = defineProps<{ stream: MediaStream | null; tela?: boolean }>()
const emit = defineEmits<{ telaVista: [] }>()

const video = ref<HTMLVideoElement | null>(null)
const temQuadro = ref(false)
let trilha: MediaStreamTrack | null = null
let pedido: number | null = null

// A tela aparece quando o quadro muda de tamanho (era a câmera, ou nada) ou,
// do mesmo tamanho, depois de um tempo recebendo quadros
const TEMPO_TELA_MS = 1000
let telaDesde: { largura: number; altura: number; quando: number } | null = null

function aoQuadro(_agora: number, quadro: VideoFrameCallbackMetadata) {
  pedido = null
  temQuadro.value = true
  if (telaDesde && (quadro.width !== telaDesde.largura || quadro.height !== telaDesde.altura || performance.now() - telaDesde.quando >= TEMPO_TELA_MS)) {
    telaDesde = null
    emit('telaVista')
  }
  esperarQuadro()
}

function esperarQuadro() {
  const el = video.value
  if (!el || pedido !== null) return
  // Navegador sem aviso de quadro: fica como antes, sem o conectando
  if (!el.requestVideoFrameCallback) {
    temQuadro.value = true
    if (telaDesde) {
      telaDesde = null
      emit('telaVista')
    }
    return
  }
  pedido = el.requestVideoFrameCallback(aoQuadro)
}

function aoParar() {
  temQuadro.value = false
}

function ligarTrilha() {
  trilha?.removeEventListener('mute', aoParar)
  trilha = props.stream?.getVideoTracks()[0] ?? null
  trilha?.addEventListener('mute', aoParar)
  temQuadro.value = false
}

onMounted(() => {
  watch(() => props.stream, ligarTrilha, { immediate: true })
  watch(() => props.tela, (tela) => {
    const el = video.value
    telaDesde = tela && el ? { largura: el.videoWidth, altura: el.videoHeight, quando: performance.now() } : null
  }, { immediate: true })
  esperarQuadro()
})

onBeforeUnmount(() => {
  trilha?.removeEventListener('mute', aoParar)
  if (pedido !== null) video.value?.cancelVideoFrameCallback(pedido)
})
</script>
