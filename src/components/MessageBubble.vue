<template>
  <div
    :id="`msg-${mensagem.id}`"
    class="mb-3 flex"
    :class="isOwn ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] rounded-xl px-3 py-2"
      :class="isOwn ? 'bg-blue-600 text-white' : 'bg-white text-slate-800'"
    >
      <p
        v-if="isGroup && !isOwn"
        class="mb-1 text-xs font-semibold text-slate-500"
      >
        {{ mensagem.remetente }}
      </p>

      <MessageContent
        v-for="conteudo in mensagem.conteudos"
        :key="`${mensagem.id}-${conteudo.id}-${conteudo.ordem}`"
        :conteudo="conteudo"
        :mensagem-id="mensagem.id"
        :is-own="isOwn"
        :get-anexo-url="getAnexoUrl"
        @open-image="(id, nome) => emit('open-image', id, nome)"
        @image-loaded="emit('image-loaded')"
        @download="(id, nome) => emit('download', id, nome)"
      />

      <div class="mt-1 flex items-center justify-end gap-1 text-[11px]">
        <span :class="isOwn ? 'text-slate-200' : 'text-slate-500'">
          {{ formatarHora(mensagem.inserida) }}
        </span>
        <!-- Enviando -->
        <svg
          v-if="isOwn && (mensagem.enviando || mensagem.id < 0)"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-3 w-3 text-slate-300"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <!-- Visualizado (check duplo azul) -->
        <svg
          v-else-if="isOwn && mensagem.visualizada"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2.5"
          stroke="currentColor"
          class="h-3 w-3 text-sky-300"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M1.5 12.5l4 4L13 9" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 12.5l4 4L19 9" />
        </svg>
        <!-- Recebido (check duplo cinza) -->
        <svg
          v-else-if="isOwn && mensagem.recebida"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2.5"
          stroke="currentColor"
          class="h-3 w-3 text-slate-300"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M1.5 12.5l4 4L13 9" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 12.5l4 4L19 9" />
        </svg>
        <!-- Enviado (check simples) -->
        <svg
          v-else-if="isOwn"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="h-3 w-3 text-slate-300"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Mensagem } from '../types/api'
import { formatarHora } from '../utils/formatters'
import MessageContent from './MessageContent.vue'

defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  'download': [identificador: string, nome: string]
}>()
</script>
