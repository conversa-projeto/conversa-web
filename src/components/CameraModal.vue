<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-black text-white">
    <div class="flex items-center justify-between px-4 py-3">
      <span class="text-sm font-medium">{{ capturado ? 'Enviar' : 'Câmera' }}</span>
      <button class="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white" title="Fechar" @click="emit('close')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>

    <!-- Prévia do que foi capturado -->
    <template v-if="capturado">
      <div class="flex min-h-0 flex-1 items-center justify-center px-4">
        <video v-if="capturadoEhVideo" :src="urlCapturado" controls autoplay playsinline class="max-h-full max-w-full rounded-lg" />
        <img v-else :src="urlCapturado" alt="" class="max-h-full max-w-full rounded-lg object-contain" />
      </div>
      <div class="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-4">
        <button class="shrink-0 rounded-full px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white" @click="refazer">
          Refazer
        </button>
        <input
          ref="campoLegenda"
          v-model="legenda"
          class="min-w-0 flex-1 rounded-full bg-white/15 px-4 py-2 text-sm text-white placeholder-white/60 outline-none focus:bg-white/20"
          placeholder="Adicione uma legenda..."
          @keydown.enter.prevent="enviar"
        />
        <button
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700"
          title="Enviar"
          @click="enviar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </div>
    </template>

    <!-- Webcam ao vivo -->
    <template v-else>
      <div class="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <video ref="videoRef" autoplay muted playsinline class="max-h-full max-w-full -scale-x-100 rounded-lg" />
        <p v-if="erro" class="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-sm text-white/80">{{ erro }}</p>
        <span
          v-if="gravando"
          class="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-sm tabular-nums"
        >
          <span class="h-2 w-2 animate-pulse rounded-full bg-danger-500" />
          {{ formatarDuracao(segundos) }}
        </span>
      </div>
      <div class="relative flex items-center justify-center px-4 py-5">
        <button
          class="flex h-16 w-16 select-none items-center justify-center rounded-full border-4 border-white transition disabled:opacity-40"
          :disabled="!pronta"
          :title="dica"
          @pointerdown.prevent="apertar"
          @pointerup="soltar"
          @pointerleave="sair"
          @contextmenu.prevent
        >
          <span class="rounded-full transition-all" :class="gravando ? 'h-6 w-6 rounded-md bg-danger-500' : 'h-12 w-12 bg-white'" />
        </button>
        <button
          v-if="cameras.length > 1 && !gravando"
          class="absolute right-6 rounded-full p-2.5 text-white/80 hover:bg-white/10 hover:text-white"
          title="Trocar de câmera"
          @click="trocarCamera"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-6 w-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>
      <p class="pb-4 text-center text-xs text-white/60">{{ dica }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatarDuracao } from '../utils/formatters'

// Câmera do "+": no computador, a webcam ao vivo (clique tira a foto, segurar
// grava o vídeo); no celular, chega o arquivo da câmera do sistema
// (arquivoInicial) e só a prévia aparece. A prévia tem legenda e "Enviar".
const props = defineProps<{
  arquivoInicial?: File | null
  podeFoto: boolean
  podeVideo: boolean
}>()

const emit = defineEmits<{
  enviar: [arquivo: File, legenda: string]
  refazer: []
  close: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const campoLegenda = ref<HTMLInputElement | null>(null)
const erro = ref('')
const pronta = ref(false)
const cameras = ref<MediaDeviceInfo[]>([])
const cameraAtual = ref<string | undefined>()
const gravando = ref(false)
// Segurando e arrastando para fora do botão, a gravação continua sozinha
const travado = ref(false)
const segundos = ref(0)
const capturado = ref<File | null>(props.arquivoInicial ?? null)
const legenda = ref('')

let stream: MediaStream | null = null
let gravador: MediaRecorder | null = null
let pedacos: Blob[] = []
let esperaSegurar: ReturnType<typeof setTimeout> | null = null
let relogio: ReturnType<typeof setInterval> | null = null

const capturadoEhVideo = computed(() => capturado.value?.type.startsWith('video/') ?? false)
const urlCapturado = ref('')
watch(capturado, (arquivo, _, aoLimpar) => {
  if (!arquivo) return
  const url = URL.createObjectURL(arquivo)
  urlCapturado.value = url
  aoLimpar(() => URL.revokeObjectURL(url))
  void nextTick(() => campoLegenda.value?.focus())
}, { immediate: true })

const dica = computed(() => {
  if (travado.value) return 'Gravação travada: clique para parar'
  if (props.podeFoto && props.podeVideo) {
    return gravando.value ? 'Solte para parar ou arraste para fora para travar' : 'Clique para tirar uma foto, segure para gravar um vídeo'
  }
  if (props.podeVideo) return gravando.value ? 'Clique para parar' : 'Clique para gravar um vídeo'
  return 'Clique para tirar uma foto'
})

async function abrirCamera() {
  pararCamera()
  erro.value = ''
  const video: MediaTrackConstraints = cameraAtual.value
    ? { deviceId: { exact: cameraAtual.value } }
    : { width: { ideal: 1280 }, height: { ideal: 720 } }
  try {
    // O áudio só serve ao vídeo; sem microfone, grava sem som
    stream = props.podeVideo
      ? await navigator.mediaDevices.getUserMedia({ video, audio: true }).catch(() => navigator.mediaDevices.getUserMedia({ video }))
      : await navigator.mediaDevices.getUserMedia({ video })
  } catch {
    erro.value = 'Não foi possível abrir a câmera. Confira a permissão do navegador.'
    return
  }
  cameraAtual.value = stream.getVideoTracks()[0]?.getSettings().deviceId
  cameras.value = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
  if (videoRef.value) videoRef.value.srcObject = stream
  pronta.value = true
}

function pararCamera() {
  pronta.value = false
  stream?.getTracks().forEach((trilha) => trilha.stop())
  stream = null
}

function trocarCamera() {
  const indice = cameras.value.findIndex((c) => c.deviceId === cameraAtual.value)
  cameraAtual.value = cameras.value[(indice + 1) % cameras.value.length]?.deviceId
  void abrirCamera()
}

function apertar() {
  if (!pronta.value) return
  if (!props.podeFoto) {
    if (gravando.value) pararGravacao()
    else iniciarGravacao()
    return
  }
  if (travado.value) {
    pararGravacao()
    return
  }
  if (!props.podeVideo) return
  esperaSegurar = setTimeout(() => {
    esperaSegurar = null
    iniciarGravacao()
  }, 300)
}

function soltar() {
  if (!props.podeFoto || travado.value) return
  if (esperaSegurar) {
    clearTimeout(esperaSegurar)
    esperaSegurar = null
    tirarFoto()
  } else if (gravando.value) {
    pararGravacao()
  } else if (!props.podeVideo) {
    tirarFoto()
  }
}

// Saiu do botão antes de começar a gravar: não tira a foto; gravando, trava
function sair() {
  if (!props.podeFoto) return
  if (esperaSegurar) {
    clearTimeout(esperaSegurar)
    esperaSegurar = null
  } else if (gravando.value) {
    travado.value = true
  }
}

function tirarFoto() {
  const video = videoRef.value
  if (!video?.videoWidth) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d')?.drawImage(video, 0, 0)
  canvas.toBlob((blob) => {
    if (!blob) return
    capturado.value = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })
    pararCamera()
  }, 'image/jpeg', 0.92)
}

function formatoVideo() {
  return ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find((tipo) => MediaRecorder.isTypeSupported(tipo)) ?? ''
}

function iniciarGravacao() {
  if (!stream) return
  const tipo = formatoVideo()
  gravador = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined)
  pedacos = []
  gravador.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data) }
  gravador.onstop = () => {
    const mime = (gravador?.mimeType || tipo || 'video/webm').split(';')[0]!
    const extensao = mime.includes('mp4') ? 'mp4' : 'webm'
    capturado.value = new File(pedacos, `video-${Date.now()}.${extensao}`, { type: mime })
    gravador = null
    pararCamera()
  }
  gravador.start()
  gravando.value = true
  segundos.value = 0
  relogio = setInterval(() => { segundos.value++ }, 1000)
}

function pararGravacao() {
  gravando.value = false
  travado.value = false
  if (relogio) clearInterval(relogio)
  relogio = null
  gravador?.stop()
}

// No celular, refazer abre de novo a câmera do sistema
function refazer() {
  capturado.value = null
  legenda.value = ''
  if (props.arquivoInicial) emit('refazer')
  else void nextTick(abrirCamera)
}

function enviar() {
  if (capturado.value) emit('enviar', capturado.value, legenda.value.trim())
}

function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', aoTeclar)
  if (!capturado.value) void abrirCamera()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', aoTeclar)
  if (esperaSegurar) clearTimeout(esperaSegurar)
  if (relogio) clearInterval(relogio)
  if (gravador) {
    gravador.onstop = null
    gravador.stop()
  }
  pararCamera()
})
</script>
