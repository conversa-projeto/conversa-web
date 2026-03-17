<template>
  <div
    :id="`msg-${mensagem.id}`"
    class="group mb-3 flex items-center gap-1"
    :class="isOwn ? 'justify-end' : 'justify-start'"
  >
    <div
      v-if="isOwn && mensagem.id > 0"
      class="flex shrink-0 flex-col items-center opacity-0 transition group-hover:opacity-100"
    >
      <button
        class="rounded-full p-1.5 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600"
        title="Responder"
        @click="emit('reply', mensagem)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd" />
        </svg>
      </button>

      <button
        class="-mt-2 rounded-full p-2.5 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600"
        title="Encaminhar"
        @click="emit('forward', mensagem)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-[22px] w-[22px]">
          <path d="M3.22 10.53a.75.75 0 0 1 .72-.53h8.498l-2.97-2.97a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L12.438 11.5H3.94a.75.75 0 0 1-.72-.97Z" />
        </svg>
      </button>
    </div>

    <div
      class="max-w-[80%] rounded-xl px-3 py-2"
      :class="isOwn ? 'bg-primary-600 dark:bg-primary-800 text-white' : 'bg-surface-base text-surface-800'"
    >
      <p
        v-if="isGroup && !isOwn"
        class="mb-1 text-xs font-semibold text-surface-500"
      >
        {{ mensagem.remetente }}
      </p>

      <div
        v-if="referenciaMensagem(mensagem)"
        class="mb-1 max-w-52 rounded border-l-4 px-2 py-1"
        :class="[
          isOwn ? 'border-white/50 bg-white/20 text-white' : 'border-surface-300 bg-surface-100 text-surface-800',
          referenciaNavegavel(mensagem) ? 'cursor-pointer hover:opacity-80' : ''
        ]"
        @click="abrirReferencia(mensagem)"
      >
        <span class="text-[10px] font-semibold" :class="isOwn ? 'text-primary-200' : 'text-surface-600'">
          {{ tituloReferenciaMensagem(mensagem) }}
        </span>
        <p class="truncate text-xs" :class="isOwn ? 'text-primary-100/70' : 'text-surface-500'">
          {{ referenciaMensagem(mensagem)?.conteudo_resumo }}
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
        <span :class="isOwn ? 'text-white/70' : 'text-surface-500'">
          {{ formatarHora(mensagem.inserida) }}
        </span>
        <svg
          v-if="isOwn && (mensagem.enviando || mensagem.id < 0)"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-3 w-3 text-surface-300"
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
          class="h-3 w-3 text-info-300"
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
          class="h-3 w-3 text-surface-300"
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
          class="h-3 w-3 text-surface-300"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>

    <div
      v-if="!isOwn && mensagem.id > 0"
      class="flex shrink-0 flex-col items-center opacity-0 transition group-hover:opacity-100"
    >
      <button
        class="rounded-full p-1.5 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600"
        title="Responder"
        @click="emit('reply', mensagem)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd" />
        </svg>
      </button>

      <button
        class="-mt-2 rounded-full p-2.5 text-surface-400 transition hover:bg-surface-100 hover:text-surface-600"
        title="Encaminhar"
        @click="emit('forward', mensagem)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-[22px] w-[22px]">
          <path d="M3.22 10.53a.75.75 0 0 1 .72-.53h8.498l-2.97-2.97a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L12.438 11.5H3.94a.75.75 0 0 1-.72-.97Z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TipoMensagemReferencia, type Mensagem } from '../types/api'
import { obterReferenciaPrincipal, tituloReferencia } from '../utils/messageReferences'
import { formatarHora } from '../utils/formatters'
import MessageContent from './MessageContent.vue'

defineProps<{
  mensagem: Mensagem
  isOwn: boolean
  isGroup: boolean
  getAnexoUrl: (identificador: string) => string
}>()

function referenciaMensagem(mensagem: Mensagem) {
  return obterReferenciaPrincipal(mensagem)
}

function referenciaNavegavel(mensagem: Mensagem) {
  const referencia = referenciaMensagem(mensagem)
  return !!referencia && Number(referencia.tipo) === TipoMensagemReferencia.Resposta
}

function abrirReferencia(mensagem: Mensagem) {
  const referencia = referenciaMensagem(mensagem)
  if (!referencia || !referenciaNavegavel(mensagem)) return
  emit('go-to-message', referencia.id)
}

function tituloReferenciaMensagem(mensagem: Mensagem) {
  const referencia = referenciaMensagem(mensagem)
  if (!referencia) return ''
  return tituloReferencia(referencia.tipo, referencia.remetente)
}

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  'download': [identificador: string, nome: string]
  'reply': [mensagem: Mensagem]
  'forward': [mensagem: Mensagem]
  'go-to-message': [mensagemId: number]
}>()
</script>
