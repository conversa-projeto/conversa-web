<template>
  <div
    v-if="aberta"
    class="fixed inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-black/90"
    @click.self="emit('close')"
    @mousemove="emit('drag-move', $event)"
    @mouseup="emit('drag-end')"
    @mouseleave="emit('drag-end')"
  >
    <div class="flex flex-1 items-center justify-center p-4" @click.self="emit('close')">
      <div class="relative" :style="!imagemCarregada ? { minHeight: '12rem', minWidth: '16rem' } : {}">
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
          @mousedown.prevent="emit('drag-start', $event)"
          @dblclick.prevent="emit('reset-zoom')"
        />
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

    <div class="relative z-10 mb-4 flex items-center gap-3 rounded-full bg-black/60 px-5 py-2 backdrop-blur-sm">
      <button class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-base/15 text-white text-lg hover:bg-surface-base/25" @click="emit('zoom-out')">-</button>
      <span class="min-w-14 text-center text-xs text-white/70">{{ Math.round(zoom * 100) }}%</span>
      <button class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-base/15 text-white text-lg hover:bg-surface-base/25" @click="emit('zoom-in')">+</button>
      <div class="mx-2 h-5 w-px bg-surface-base/20"></div>
      <button class="rounded-full bg-surface-base/15 px-4 py-1.5 text-xs text-white hover:bg-surface-base/25" @click="emit('close')">Fechar</button>
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

watch(() => props.url, () => {
  imagemCarregada.value = false
})

watch(() => props.aberta, (aberta) => {
  if (!aberta) imagemCarregada.value = false
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
}>()
</script>
