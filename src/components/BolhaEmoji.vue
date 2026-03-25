<template>
  <div class="w-fit py-1">
    <p
      v-if="isGroup && !isOwn"
      class="mb-0.5 w-full text-xs font-semibold text-surface-500"
    >
      {{ mensagem.remetente }}
    </p>

    <div class="flex flex-col" :class="isOwn ? 'items-end' : 'items-start'">
      <p class="text-4xl leading-tight">{{ mensagem.conteudos[0].conteudo }}</p>

      <MensagemStatus
        :mensagem="mensagem"
        :is-own="isOwn"
        variante="emoji"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Mensagem } from '../types/api'
import MensagemStatus from './MensagemStatus.vue'

defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()
</script>
