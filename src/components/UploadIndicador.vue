<template>
  <div v-if="mostrarIndicador" class="shrink-0 border-b border-surface-200 bg-surface-base px-4 py-2">
    <div v-for="upload in uploadsAtivos" :key="upload.id" class="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0 text-primary-600">
        <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
      </svg>
      <span class="truncate text-xs text-surface-600">{{ upload.nomeArquivo }}</span>
      <div class="flex-1">
        <div class="h-1.5 overflow-hidden rounded-full bg-surface-200">
          <div
            class="h-full rounded-full bg-primary-600 transition-all duration-300"
            :style="{ width: upload.progresso + '%' }"
          />
        </div>
      </div>
      <span class="shrink-0 text-xs tabular-nums text-surface-500">{{ upload.progresso }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUploadProgress } from '../composables/useUploadProgress'

const { uploadsAtivos, mostrarIndicador } = useUploadProgress()
</script>
