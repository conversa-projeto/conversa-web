<template>
  <div
    class="flex shrink-0 items-center justify-end gap-1 text-[11px]"
    :class="classeContainer"
  >
    <span :class="classeTexto">
      {{ formatarHora(mensagem.inserida) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Mensagem } from '../types/api'
import { formatarHora } from '../utils/formatters'

export type VarianteStatus = 'imagem' | 'codigo' | 'emoji' | 'texto-curto' | 'texto' | 'padrao'

const props = defineProps<{
  mensagem: Mensagem
  isOwn?: boolean
  variante?: VarianteStatus
}>()

const classeContainer = computed(() => {
  switch (props.variante) {
    case 'imagem':
      return 'absolute bottom-1.5 right-2'
    case 'codigo':
      return 'mt-0.5 px-2.5 pb-0.5'
    case 'emoji':
      return 'mt-0.5 rounded-full px-2 py-0.5 w-fit ' + (props.isOwn ? 'bg-primary-600 dark:bg-primary-700' : 'bg-surface-300 dark:bg-surface-200')
    case 'texto-curto':
      return '-mt-1'
    case 'texto':
      return '-mt-1.5'
    default:
      return 'mt-0.5'
  }
})

const classeTexto = computed(() => {
  if (props.variante === 'imagem') return 'text-white/90'
  if (props.variante === 'emoji') return props.isOwn ? 'text-white/65' : 'text-surface-500'
  return props.isOwn ? 'text-white/65' : 'text-surface-500'
})
</script>
