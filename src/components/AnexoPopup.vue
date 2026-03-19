<template>
  <div ref="popupRef" class="absolute bottom-full left-0 z-20 mb-2 min-w-[180px] rounded-lg border border-surface-200 bg-surface-base py-1 shadow-lg dark:border-surface-700 dark:bg-surface-800">
    <button
      v-for="item in itens"
      :key="item.tipo"
      class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-700"
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

type TipoAnexo = 'documento' | 'fotos-videos' | 'audio' | 'codigo' | 'close'
const emit = defineEmits<{
  documento: []
  'fotos-videos': []
  audio: []
  codigo: []
  close: []
}>()

function emitirTipo(tipo: TipoAnexo) {
  ;(emit as (evt: string) => void)(tipo)
}

const popupRef = ref<HTMLElement>()

const itens = [
  {
    tipo: 'documento' as TipoAnexo,
    label: 'Documento',
    bgClass: 'bg-violet-100 dark:bg-violet-900/40',
    iconClass: 'text-violet-600 dark:text-violet-400',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />'
  },
  {
    tipo: 'fotos-videos' as TipoAnexo,
    label: 'Fotos e vídeos',
    bgClass: 'bg-sky-100 dark:bg-sky-900/40',
    iconClass: 'text-sky-600 dark:text-sky-400',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />'
  },
  {
    tipo: 'audio' as TipoAnexo,
    label: 'Áudio',
    bgClass: 'bg-orange-100 dark:bg-orange-900/40',
    iconClass: 'text-orange-600 dark:text-orange-400',
    path: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />'
  },
  {
    tipo: 'codigo' as TipoAnexo,
    label: 'Código',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
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
