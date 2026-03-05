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
        :get-anexo-url="getAnexoUrl"
        @open-image="(id, nome) => emit('open-image', id, nome)"
        @image-loaded="emit('image-loaded')"
        @download="(id, nome) => emit('download', id, nome)"
      />

      <div class="mt-1 flex items-center justify-end gap-1 text-[11px]">
        <span :class="isOwn ? 'text-slate-200' : 'text-slate-500'">
          {{ formatarHora(mensagem.inserida) }}
        </span>
        <span
          v-if="isOwn"
          :class="statusEntregaClasse(mensagem)"
        >
          {{ statusEntrega(mensagem) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Mensagem } from '../types/api'
import { formatarHora, statusEntrega, statusEntregaClasse } from '../utils/formatters'
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
