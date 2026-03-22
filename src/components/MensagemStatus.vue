<template>
  <div
    class="flex shrink-0 items-center justify-end gap-1 text-[11px]"
    :class="classeContainer"
  >
    <span :class="classeTexto">
      {{ formatarHora(mensagem.inserida) }}
    </span>
    <svg
      v-if="isOwn && (mensagem.enviando || mensagem.id < 0)"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="h-3 w-3 text-primary-200"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
    <svg
      v-else-if="isOwn && mensagem.visualizada"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="2.5"
      stroke="currentColor"
      class="h-3 w-3 text-primary-600"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M1.5 12.5l4 4L13 9" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 12.5l4 4L19 9" />
    </svg>
    <svg
      v-else-if="isOwn && mensagem.recebida"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="2.5"
      stroke="currentColor"
      class="h-3 w-3 text-primary-200"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M1.5 12.5l4 4L13 9" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 12.5l4 4L19 9" />
    </svg>
    <svg
      v-else-if="isOwn"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="2"
      stroke="currentColor"
      class="h-3 w-3 text-primary-200"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Mensagem } from '../types/api'
import { formatarHora } from '../utils/formatters'

export type VarianteStatus = 'imagem' | 'codigo' | 'emoji' | 'texto-curto' | 'padrao'

const props = defineProps<{
  mensagem: Mensagem
  isOwn?: boolean
  variante?: VarianteStatus
}>()

const classeContainer = computed(() => {
  switch (props.variante) {
    case 'imagem':
      return 'absolute bottom-1 right-1 rounded-full bg-black/50 px-2 py-0.5'
    case 'codigo':
      return 'mt-0.5 px-2.5 pb-0.5'
    case 'emoji':
      return 'mt-0.5 rounded-full px-2 py-0.5 w-fit ml-auto ' + (props.isOwn ? 'bg-primary-600 dark:bg-primary-700' : 'bg-surface-300 dark:bg-surface-200')
    case 'texto-curto':
      return '-mt-1'
    default:
      return 'mt-0.5'
  }
})

const classeTexto = computed(() => {
  if (props.variante === 'imagem') return 'text-white/90'
  if (props.variante === 'emoji') return props.isOwn ? 'text-primary-200/70' : 'text-surface-500'
  return props.isOwn ? 'text-primary-200/70' : 'text-surface-500'
})
</script>
