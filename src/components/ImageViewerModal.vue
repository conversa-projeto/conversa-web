<template>
  <div
    v-if="aberta"
    class="fixed inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-black/90"
    @click.self="menuContexto ? (menuContexto = null) : emit('close')"
    @mousedown="fecharMenu"
    @mousemove="emit('drag-move', $event)"
    @mouseup="emit('drag-end')"
    @mouseleave="emit('drag-end')"
  >
    <div class="flex flex-1 items-center justify-center p-4" @click.self="emit('close')">
      <div class="relative" :style="!imagemCarregada ? { minHeight: '12rem', minWidth: '16rem' } : {}" @click.self="emit('close')">
        <img
          :src="url"
          :alt="nome"
          class="max-h-[85vh] max-w-[92vw] select-none object-contain"
          :class="[
            zoom !== 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
            transicaoAtiva ? 'transition-transform duration-300 ease-out' : ''
          ]"
          :style="{ transform: `scale(${zoom}) translate(${translateX / zoom}px, ${translateY / zoom}px)` }"
          @load="imagemCarregada = true"
          @wheel.prevent="(e) => emit('zoom-wheel', e)"
          @mousedown.left.prevent="emit('drag-start', $event)"
          @dblclick.prevent="emit('reset-zoom')"
          @contextmenu.prevent="menuContexto = { x: $event.clientX, y: $event.clientY }"
        />

        <!-- Menu de contexto customizado -->
        <div
          v-if="menuContexto"
          class="fixed z-50 min-w-40 rounded-lg border border-surface-200 bg-surface-base py-1 shadow-xl"
          :style="{ left: menuContexto.x + 'px', top: menuContexto.y + 'px' }"
        >
          <button
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 hover:bg-surface-100"
            @click="emit('copy'); menuContexto = null"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
              <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
              <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
            </svg>
            Copiar imagem
          </button>
        </div>
        <!-- Overlay de carregamento sobre a imagem -->
        <div v-if="!imagemCarregada" class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="flex flex-col items-center gap-3">
            <svg class="h-8 w-8 animate-spin text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="text-sm text-white/50">Carregando imagem</span>
          </div>
        </div>
      </div>
    </div>

    <div class="relative z-10 mb-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
      <button class="flex h-8 w-8 items-center justify-center rounded-full text-white text-lg hover:bg-white/15" @click="emit('zoom-out')">-</button>
      <span class="min-w-10 text-center text-xs text-white/70">{{ Math.round(zoom * 100) }}%</span>
      <button class="flex h-8 w-8 items-center justify-center rounded-full text-white text-lg hover:bg-white/15" @click="emit('zoom-in')">+</button>
      <div class="mx-1 h-5 w-px bg-white/20"></div>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/15"
        title="Copiar imagem (Ctrl+C)"
        @click="emit('copy')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
          <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
        </svg>
      </button>
      <button class="rounded-full px-4 py-1.5 text-xs text-white hover:bg-white/15" @click="emit('close')">Fechar</button>
    </div>

    <!-- Galeria de imagens -->
    <div v-if="galeria.length > 0" class="relative z-10 mb-4 flex items-center gap-1">
      <button
        v-if="galeria.length > 10"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-30"
        :disabled="!podeMoverEsquerda"
        @click="scrollGaleria(-1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
        </svg>
      </button>

      <div
        ref="galeriaRef"
        class="flex gap-1 overflow-x-hidden px-1 py-1"
        style="max-width: min(680px, 90vw); scroll-behavior: smooth;"
      >
        <button
          v-for="item in galeria"
          :key="item.identificador"
          :data-id="item.identificador"
          class="relative h-14 w-14 shrink-0 rounded transition-all"
          :class="item.identificador === identificadorAtual
            ? 'ring-2 ring-white opacity-100'
            : 'opacity-60 hover:opacity-90'"
          @click="emit('select-image', item.identificador, item.nome)"
        >
          <div class="h-full w-full overflow-hidden rounded">
            <img
              v-if="anexosUrl[item.identificador]"
              :src="anexosUrl[item.identificador]"
              :alt="item.nome"
              class="h-full w-full object-cover"
            />
            <div v-else class="h-full w-full bg-white/10">
              <div class="flex h-full items-center justify-center">
                <svg class="h-4 w-4 animate-spin text-white/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </div>
            </div>
          </div>
        </button>
      </div>

      <button
        v-if="galeria.length > 10"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-30"
        :disabled="!podeMoverDireita"
        @click="scrollGaleria(1)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  aberta: boolean
  url: string
  nome: string
  zoom: number
  translateX: number
  translateY: number
  isDragging: boolean
  transicaoAtiva: boolean
  galeria: { identificador: string; nome: string }[]
  identificadorAtual: string
  anexosUrl: Record<string, string>
}>()

const imagemCarregada = ref(false)
const menuContexto = ref<{ x: number; y: number } | null>(null)
const galeriaRef = ref<HTMLElement | null>(null)
const podeMoverEsquerda = ref(false)
const podeMoverDireita = ref(true)

function fecharMenu(e: MouseEvent) {
  if (menuContexto.value) {
    menuContexto.value = null
    e.stopPropagation()
  }
}

function scrollGaleria(direcao: -1 | 1) {
  const el = galeriaRef.value
  if (!el) return
  const passo = 56 * 6 + 5 * 5 // 6 thumbnails + gaps
  el.scrollLeft += direcao * passo
  nextTick(() => atualizarEstadoScroll())
}

function atualizarEstadoScroll() {
  const el = galeriaRef.value
  if (!el) return
  podeMoverEsquerda.value = el.scrollLeft > 0
  podeMoverDireita.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

watch(() => props.url, () => {
  imagemCarregada.value = false
})

watch(() => props.aberta, (aberta) => {
  if (!aberta) {
    imagemCarregada.value = false
    menuContexto.value = null
  }
})

watch(() => props.identificadorAtual, () => {
  nextTick(() => {
    const container = galeriaRef.value
    if (!container) return
    const el = container.querySelector(`[data-id="${props.identificadorAtual}"]`) as HTMLElement | null
    if (!el) return
    const containerLeft = container.scrollLeft
    const containerRight = containerLeft + container.clientWidth
    const elLeft = el.offsetLeft
    const elRight = elLeft + el.offsetWidth
    if (elLeft < containerLeft || elRight > containerRight) {
      el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
    nextTick(() => atualizarEstadoScroll())
  })
})

const emit = defineEmits<{
  'close': []
  'zoom-in': []
  'zoom-out': []
  'zoom-wheel': [event: WheelEvent]
  'drag-start': [event: MouseEvent]
  'drag-move': [event: MouseEvent]
  'drag-end': []
  'reset-zoom': []
  'copy': []
  'select-image': [identificador: string, nome: string]
}>()
</script>
