<template>
  <!-- Sobre o vídeo de uma tela compartilhada: desenha os ponteiros dos
       outros e, com o ponteiro ligado, envia a posição do mouse -->
  <div
    ref="raiz"
    class="absolute inset-0 overflow-hidden"
    :class="capturar ? 'cursor-crosshair' : 'pointer-events-none'"
    @pointermove="aoMover"
    @pointerleave="sair"
    @click.stop
  >
    <div
      v-for="ponteiro in ponteirosDoAlvo"
      :key="ponteiro.usuarioId"
      class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75 ease-linear"
      :style="posicao(ponteiro)"
    >
      <span class="block h-4 w-4 rounded-full border-2 border-white shadow-md" :class="cor(ponteiro.usuarioId)"></span>
      <span
        class="absolute left-3 top-3 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-md"
        :class="cor(ponteiro.usuarioId)"
      >{{ ponteiro.nome }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCallStore, type PonteiroRemoto } from '../stores/call'

const props = defineProps<{
  // Quem está compartilhando a tela mostrada neste vídeo
  alvo: number
  // Envia a posição do mouse (quem assiste, com o ponteiro ligado)
  capturar: boolean
}>()

const call = useCallStore()
const raiz = ref<HTMLElement | null>(null)
// Muda quando o vídeo ou o quadro mudam de tamanho, para refazer as posições
const versaoLayout = ref(0)
let dentro = false

const ponteirosDoAlvo = computed(() => [...call.ponteiros.values()].filter((p) => p.alvo === props.alvo))

const CORES = ['bg-danger-500', 'bg-primary-500', 'bg-success-600', 'bg-warning-500', 'bg-info-500']
function cor(usuarioId: number) {
  return CORES[usuarioId % CORES.length]
}

// Onde a imagem fica dentro do quadro: o vídeo mantém a proporção
// (object-contain deixa faixas, object-cover corta)
function areaDaImagem() {
  const el = raiz.value
  const video = el?.parentElement?.querySelector('video')
  if (!el || !video?.videoWidth || !video.videoHeight) return null
  const quadro = el.getBoundingClientRect()
  const ajustar = getComputedStyle(video).objectFit === 'cover' ? Math.max : Math.min
  const escala = ajustar(quadro.width / video.videoWidth, quadro.height / video.videoHeight)
  const largura = video.videoWidth * escala
  const altura = video.videoHeight * escala
  return {
    quadro,
    esquerda: (quadro.width - largura) / 2,
    topo: (quadro.height - altura) / 2,
    largura,
    altura,
  }
}

function posicao(ponteiro: PonteiroRemoto) {
  void versaoLayout.value
  const area = areaDaImagem()
  if (!area) return { display: 'none' }
  return {
    left: `${area.esquerda + ponteiro.x * area.largura}px`,
    top: `${area.topo + ponteiro.y * area.altura}px`,
  }
}

function aoMover(evento: PointerEvent) {
  if (!props.capturar) return
  const area = areaDaImagem()
  if (!area) return
  const x = (evento.clientX - area.quadro.left - area.esquerda) / area.largura
  const y = (evento.clientY - area.quadro.top - area.topo) / area.altura
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    sair()
    return
  }
  dentro = true
  call.moverPonteiro(props.alvo, x, y)
}

function sair() {
  if (!dentro) return
  dentro = false
  call.moverPonteiro(props.alvo, null, null)
}

watch(() => props.capturar, (capturar) => {
  if (!capturar) sair()
})

let observador: ResizeObserver | null = null
let video: HTMLVideoElement | null = null
const atualizarLayout = () => { versaoLayout.value++ }

onMounted(() => {
  video = raiz.value?.parentElement?.querySelector('video') ?? null
  video?.addEventListener('resize', atualizarLayout)
  video?.addEventListener('loadedmetadata', atualizarLayout)
  if (typeof ResizeObserver !== 'undefined' && raiz.value) {
    observador = new ResizeObserver(atualizarLayout)
    observador.observe(raiz.value)
  }
})

onUnmounted(() => {
  sair()
  observador?.disconnect()
  video?.removeEventListener('resize', atualizarLayout)
  video?.removeEventListener('loadedmetadata', atualizarLayout)
})
</script>
