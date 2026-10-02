<template>
  <div
    class="cursor-pointer select-none rounded-xl border border-dashed px-2.5 pb-0.5 pt-1"
    :class="isOwn ? 'border-primary-300 bg-primary-600/50 text-white' : 'border-surface-400 bg-surface-300/60 text-surface-700 dark:bg-surface-200/60'"
    role="button"
    tabindex="0"
    :aria-expanded="revelada"
    :title="revelada ? 'Clique para ocultar o conteúdo' : 'Clique para ver o conteúdo'"
    @click="alternar"
    @keydown.enter.prevent="revelada = !revelada"
    @keydown.space.prevent="revelada = !revelada"
  >
    <p
      v-if="isGroup && !isOwn"
      class="mb-0.5 w-full text-xs font-semibold text-surface-500"
    >
      {{ mensagem.remetente }}
    </p>

    <!-- Revelada: o conteúdo original, ainda marcado como excluído -->
    <template v-if="revelada">
      <p class="mb-0.5 text-[10px] italic" :class="isOwn ? 'text-white/70' : 'text-surface-500'">Mensagem excluída</p>
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
    </template>

    <div class="flex flex-wrap items-baseline justify-end gap-x-3">
      <span v-if="!revelada" class="flex items-center gap-1.5 text-[13.5px] italic" :class="isOwn ? 'text-white/80' : 'text-surface-500'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        Mensagem excluída
      </span>
      <MensagemStatus
        :mensagem="mensagem"
        :is-own="isOwn"
        variante="texto-curto"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Mensagem } from '../types/api'
import MessageContent from './MessageContent.vue'
import MensagemStatus from './MensagemStatus.vue'

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

// Um clique mostra o conteúdo original e outro volta a ocultar. Com o conteúdo
// à mostra, clicar nos controles dele (abrir, baixar, tocar áudio, abrir a
// imagem, seguir um link) não oculta a mensagem.
const CONTROLES = 'button, a, audio, video, img, input, [data-media-player]'

const revelada = ref(false)

function alternar(evento: MouseEvent) {
  if ((evento.target as Element).closest(CONTROLES)) return
  revelada.value = !revelada.value
}
</script>
