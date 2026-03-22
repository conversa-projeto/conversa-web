<template>
  <div ref="popupRef" class="absolute bottom-full left-0 z-20 mb-2 min-w-[180px] rounded-lg border border-surface-200 bg-surface-base py-1 shadow-lg">
    <button
      v-for="item in itens"
      :key="item.tipo"
      class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-100"
      @click="emitirTipo(item.tipo)"
    >
      <span class="flex h-8 w-8 items-center justify-center rounded-full" :class="item.bgClass">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4" :class="item.iconClass" v-html="item.path"></svg>
      </span>
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

type TipoAnexo = 'arquivo' | 'codigo' | 'close'
const emit = defineEmits<{
  arquivo: []
  codigo: []
  close: []
}>()

function emitirTipo(tipo: TipoAnexo) {
  ;(emit as (evt: string) => void)(tipo)
}

const popupRef = ref<HTMLElement>()

const itens = [
  {
    tipo: 'arquivo' as TipoAnexo,
    label: 'Arquivo',
    bgClass: 'bg-info-100 dark:bg-info-900',
    iconClass: 'text-info-600 dark:text-info-300',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />'
  },
  {
    tipo: 'codigo' as TipoAnexo,
    label: 'Código',
    bgClass: 'bg-success-100 dark:bg-success-900',
    iconClass: 'text-success-600 dark:text-success-300',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />'
  }
]

function onClickOutside(e: MouseEvent) {
  if (popupRef.value && !popupRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('click', onClickOutside), 0)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>
