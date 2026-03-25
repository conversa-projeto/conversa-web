<template>
  <div
    class="min-w-0 overflow-hidden rounded-xl px-2.5 pb-0.5 pt-1"
    :class="isOwn ? 'bg-primary-600 text-white' : 'bg-surface-300 dark:bg-surface-200 text-surface-800'"
  >
    <p
      v-if="isGroup && !isOwn"
      class="mb-0.5 w-full text-xs font-semibold text-surface-500"
    >
      {{ mensagem.remetente }}
    </p>

    <div :class="mensagem.conteudos.length > 1 ? (isOwn ? 'divide-y divide-white/15' : 'divide-y divide-surface-400/30') : ''">
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
      >
        <template #audio-status>
          <MensagemStatus
            :mensagem="mensagem"
            :is-own="isOwn"
            variante="padrao"
          />
        </template>
      </MessageContent>

      <MensagemStatus
        v-if="!somenteAudio"
        :mensagem="mensagem"
        :is-own="isOwn"
        :variante="somenteTexto ? 'texto' : 'padrao'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Mensagem } from '../types/api'
import { TipoConteudo } from '../types/api'
import MessageContent from './MessageContent.vue'
import MensagemStatus from './MensagemStatus.vue'

const props = defineProps<{
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

const somenteAudio = computed(() =>
  props.mensagem.conteudos.length > 0 &&
  props.mensagem.conteudos.every((c) => Number(c.tipo) === TipoConteudo.Audio || Number(c.tipo) === TipoConteudo.GravacaoAudio)
)

const somenteTexto = computed(() =>
  props.mensagem.conteudos.length > 0 &&
  props.mensagem.conteudos.every((c) => Number(c.tipo) === TipoConteudo.Texto)
)
</script>
