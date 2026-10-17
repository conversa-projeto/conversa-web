<template>
  <div
    class="overflow-hidden rounded-xl p-0.5"
    :class="isOwn ? 'bg-enviada bg-fixed [background-image:var(--gradiente-enviada)] text-enviada-texto' : 'bg-recebida text-surface-800'"
  >
    <p
      v-if="isGroup && !isOwn"
      class="mb-0.5 w-full px-2 pt-1 text-xs font-semibold text-surface-500"
    >
      {{ mensagem.remetente }}
    </p>

    <MessageContent
      v-for="conteudo in mensagem.conteudos"
      :key="`${mensagem.id}-${conteudo.id}-${conteudo.ordem}`"
      :conteudo="conteudo"
      :mensagem-id="mensagem.id"
      :conversa-id="mensagem.conversa_id"
      :is-own="isOwn"
      :get-anexo-url="getAnexoUrl"
      @image-loaded="emit('image-loaded')"
    />

    <MensagemStatus
      :mensagem="mensagem"
      :is-own="isOwn"
      variante="codigo"
    />
  </div>
</template>

<script setup lang="ts">
import type { Mensagem } from '../types/api'
import MessageContent from './MessageContent.vue'
import MensagemStatus from './MensagemStatus.vue'

// Mensagem só com um local ou trajeto: o cartão do mapa com a hora embaixo
defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const emit = defineEmits<{
  'image-loaded': []
}>()
</script>
