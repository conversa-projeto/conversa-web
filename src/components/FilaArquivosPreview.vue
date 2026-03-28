<template>
  <!-- Thumbnails de imagens -->
  <div v-if="imagens.length" class="mb-2 flex gap-2 overflow-x-auto pb-0.5">
    <div
      v-for="arq in imagens"
      :key="arq.id"
      class="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-surface-300 bg-surface-100 dark:border-surface-400 dark:bg-surface-200"
    >
      <img :src="arq.previewUrl" :alt="arq.nome" class="h-full w-full object-cover" />
      <div class="absolute inset-x-0 bottom-0 truncate bg-black/40 px-1.5 py-0.5 text-[10px] leading-4 text-white">{{ arq.nome }}</div>
      <button
        class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75"
        title="Remover"
        @click="emit('remover', arq.id)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Arquivos e áudios -->
  <div v-if="outros.length" class="mb-2 grid gap-1.5" :class="outros.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'">
    <div
      v-for="arq in outros"
      :key="arq.id"
      class="group relative flex min-w-0 items-center gap-2.5 rounded-lg border border-surface-400 bg-surface-base px-3 py-2 transition dark:border-surface-300 dark:bg-surface-50"
    >
      <!-- Audio button -->
      <button
        v-if="arq.isAudio"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-200 text-primary-500 transition hover:bg-surface-300 dark:bg-surface-200 dark:text-primary-400 dark:hover:bg-surface-300"
        :title="arq.reproduzindo ? 'Pausar' : 'Ouvir'"
        @click="emit('alternar-preview', arq.id)"
      >
        <svg v-if="arq.reproduzindo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
        </svg>
      </button>

      <!-- File icon -->
      <div
        v-else
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-100 text-surface-500 dark:bg-surface-200 dark:text-surface-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
          <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
        </svg>
      </div>

      <!-- Info -->
      <div class="min-w-0 flex-1 pr-6">
        <div class="truncate text-sm font-medium text-surface-800 dark:text-surface-900" :title="arq.nome">{{ arq.nome }}</div>
        <div class="mt-0.5 truncate text-[11px] text-surface-500 dark:text-surface-600">
          <span>{{ formatarTamanho(arq.file.size) }}</span>
          <span v-if="arq.isAudio"> &middot; {{ formatarDuracao(arq.duracaoSegundos) }}</span>
        </div>
      </div>

      <!-- Remove -->
      <button
        class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-danger-500 dark:text-surface-600 dark:hover:bg-surface-300 dark:hover:text-danger-400"
        title="Remover"
        @click="emit('remover', arq.id)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatarDuracao, formatarTamanho } from '../utils/formatters'
import type { ArquivoNaFila } from '../composables/useFilaArquivos'

const props = defineProps<{
  arquivos: ArquivoNaFila[]
}>()

const emit = defineEmits<{
  'alternar-preview': [id: string]
  remover: [id: string]
}>()

const imagens = computed(() => props.arquivos.filter(a => a.isImagem))
const outros = computed(() => props.arquivos.filter(a => !a.isImagem))
</script>
