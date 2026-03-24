<template>
  <div class="mb-2 grid max-h-48 gap-1.5 overflow-y-auto" :class="arquivos.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'">
    <div
      v-for="arq in arquivos"
      :key="arq.id"
      class="group relative flex min-w-0 items-center gap-2.5 rounded-lg border border-surface-400 bg-surface-base px-3 py-2 transition dark:border-surface-300 dark:bg-surface-50"
    >
      <!-- Icon / Audio button -->
      <button
        v-if="arq.isAudio"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 transition hover:bg-primary-200 dark:bg-primary-900/40 dark:text-primary-400 dark:hover:bg-primary-900/60"
        @click="emit('alternar-preview', arq.id)"
        :title="arq.reproduzindo ? 'Pausar' : 'Ouvir'"
      >
        <svg v-if="arq.reproduzindo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
        </svg>
      </button>
      <div
        v-else
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-100 text-surface-500 dark:bg-surface-200 dark:text-surface-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
          <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
        </svg>
      </div>

      <!-- File info -->
      <div class="min-w-0 flex-1 pr-6">
        <div class="truncate text-sm font-medium text-surface-800 dark:text-surface-900" :title="arq.nome">{{ arq.nome }}</div>
        <div class="mt-0.5 truncate text-[11px] text-surface-500 dark:text-surface-600">
          <span>{{ formatarTamanho(arq.file.size) }}</span>
          <span v-if="arq.isAudio"> &middot; {{ formatarDuracao(arq.duracaoSegundos) }}</span>
        </div>
      </div>

      <!-- Remove button -->
      <button
        class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-200 hover:text-danger-500 dark:text-surface-600 dark:hover:bg-surface-300 dark:hover:text-danger-400"
        @click="emit('remover', arq.id)"
        title="Remover"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatarDuracao, formatarTamanho } from '../utils/formatters'
import type { ArquivoNaFila } from '../composables/useFilaArquivos'

defineProps<{
  arquivos: ArquivoNaFila[]
}>()

const emit = defineEmits<{
  'alternar-preview': [id: string]
  remover: [id: string]
}>()
</script>
