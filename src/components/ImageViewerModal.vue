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
      <img
        :src="url"
        :alt="nome"
        class="max-h-[85vh] max-w-[92vw] select-none object-contain"
        :class="[
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        ]"
        :style="{ transform: `scale(${zoom}) translate(${translateX / zoom}px, ${translateY / zoom}px)` }"
        @wheel.prevent="(e) => emit('zoom-wheel', e)"
        @mousedown.prevent="emit('drag-start', $event)"
      />
    </div>

    <div class="relative z-10 mb-4 flex items-center gap-3 rounded-full bg-black/60 px-5 py-2 backdrop-blur-sm">
      <button class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white text-lg hover:bg-white/25" @click="emit('zoom-out')">-</button>
      <span class="min-w-14 text-center text-xs text-white/70">{{ Math.round(zoom * 100) }}%</span>
      <button class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white text-lg hover:bg-white/25" @click="emit('zoom-in')">+</button>
      <div class="mx-2 h-5 w-px bg-white/20"></div>
      <button class="rounded-full bg-white/15 px-4 py-1.5 text-xs text-white hover:bg-white/25" @click="emit('close')">Fechar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  aberta: boolean
  url: string
  nome: string
  zoom: number
  translateX: number
  translateY: number
  isDragging: boolean
}>()

const emit = defineEmits<{
  'close': []
  'zoom-in': []
  'zoom-out': []
  'zoom-wheel': [event: WheelEvent]
  'drag-start': [event: MouseEvent]
  'drag-move': [event: MouseEvent]
  'drag-end': []
}>()
</script>
