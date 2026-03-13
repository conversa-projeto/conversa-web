<template>
  <div
    :id="`msg-${mensagem.id}`"
    class="group mb-3 flex items-center gap-1"
    :class="isOwn ? 'justify-end' : 'justify-start'"
  >
    <!-- Botão responder (esquerda, mensagens próprias) -->
    <button
      v-if="isOwn && mensagem.id > 0"
      class="shrink-0 rounded-full p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
      title="Responder"
      @click="emit('reply', mensagem)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
        <path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd" />
      </svg>
    </button>

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

      <!-- Citação da mensagem respondida -->
      <div
        v-if="mensagem.resposta_mensagem"
        class="mb-1 cursor-pointer rounded border-l-2 px-2 py-1"
        :class="isOwn ? 'border-blue-300 bg-white/10' : 'border-blue-400 bg-black/5'"
        @click="emit('go-to-message', mensagem.resposta_mensagem!.id)"
      >
        <span class="text-[10px] font-semibold" :class="isOwn ? 'text-blue-200' : 'text-slate-600'">
          {{ mensagem.resposta_mensagem.remetente }}
        </span>
        <p class="truncate text-xs" :class="isOwn ? 'text-blue-100/70' : 'text-slate-500'">
          {{ mensagem.resposta_mensagem.conteudo_resumo }}
        </p>
      </div>

      <MessageContent
        v-for="conteudo in mensagem.conteudos"
        :key="`${mensagem.id}-${conteudo.id}-${conteudo.ordem}`"
        :conteudo="conteudo"
        :mensagem-id="mensagem.id"
        :conversa-id="mensagem.conversa_id"
        :reproduzida="mensagem.reproduzida"
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

    <!-- Botão responder (direita, mensagens recebidas) -->
    <button
      v-if="!isOwn && mensagem.id > 0"
      class="shrink-0 rounded-full p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
      title="Responder"
      @click="emit('reply', mensagem)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
        <path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd" />
      </svg>
    </button>
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
  'reply': [mensagem: Mensagem]
  'go-to-message': [mensagemId: number]
}>()
</script>
