<template>
  <div class="preview-grid mb-2 flex max-h-48 min-w-0 flex-wrap items-start gap-1 overflow-y-auto rounded border border-surface-300 bg-surface-50 p-2 dark:border-surface-600 dark:bg-surface-900">
    <div
      v-for="arq in arquivos"
      :key="arq.id"
      class="preview-card flex min-h-[68px] min-w-0 w-full items-center gap-2 rounded border border-surface-300 bg-surface-100 px-2 py-2 text-xs text-surface-700 shadow-sm dark:border-surface-600 dark:bg-surface-700 dark:text-surface-200 sm:w-[400px] sm:max-w-[400px] sm:px-3"
    >
      <button
        v-if="arq.isAudio"
        class="preview-audio-btn h-8 shrink-0 rounded bg-surface-200 px-2 text-[10px] font-semibold hover:bg-surface-300 dark:bg-surface-600 dark:hover:bg-surface-500 sm:px-3 sm:text-[11px]"
        @click="emit('alternar-preview', arq.id)"
      >
        {{ arq.reproduzindo ? 'Pausar' : 'Ouvir' }}
      </button>

      <div class="preview-content min-w-0 flex-1">
        <div class="preview-name truncate text-sm font-medium text-surface-800 dark:text-surface-100" :title="arq.nome">{{ arq.nome }}</div>
        <div class="preview-meta mt-0.5 truncate text-[11px] text-surface-500 dark:text-surface-400">
          <span>{{ formatarTamanho(arq.file.size) }}</span>
          <span v-if="arq.isAudio"> - {{ formatarDuracao(arq.duracaoSegundos) }}</span>
        </div>
      </div>

      <button class="preview-remove ml-1 h-7 w-7 shrink-0 rounded text-surface-400 hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-900" @click="emit('remover', arq.id)" title="Remover">&times;</button>
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

<style scoped>
.preview-card {
  position: relative;
  min-width: 0;
  width: 100%;
  padding-right: 2.25rem;
}

.preview-content {
  min-width: 0;
  width: 100%;
}

.preview-name,
.preview-meta {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-remove {
  position: absolute;
  top: 0.25rem;
  right: 0.2rem;
  margin-left: 0;
}
</style>
