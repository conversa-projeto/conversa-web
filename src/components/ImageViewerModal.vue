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

    <div class="relative z-10 mb-4 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  aberta: boolean
  url: string
  nome: string
  zoom: number
  translateX: number
  translateY: number
  isDragging: boolean
  transicaoAtiva: boolean
}>()

const imagemCarregada = ref(false)
const menuContexto = ref<{ x: number; y: number } | null>(null)

function fecharMenu(e: MouseEvent) {
  if (menuContexto.value) {
    menuContexto.value = null
    e.stopPropagation()
  }
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
}>()
</script>
