<template>
  <div
    class="overflow-hidden rounded-xl"
    :class="isOwn ? 'bg-primary-600 dark:bg-primary-800 text-white' : 'bg-surface-base text-surface-800'"
  >
    <p
      v-if="isGroup && !isOwn"
      class="mb-0.5 w-full px-2.5 pt-0.5 text-xs font-semibold text-surface-500"
    >
      {{ mensagem.remetente }}
    </p>

    <div
      v-if="referencia"
      class="border-l-4 px-2.5 py-0.5"
      :class="[
        isOwn ? 'border-white/40 bg-white/10' : 'border-surface-300 bg-surface-200/50',
        navegavel ? 'cursor-pointer hover:opacity-80' : ''
      ]"
      @click="abrirReferencia"
    >
      <span class="text-[10px] font-semibold" :class="isOwn ? 'text-white/60' : 'text-surface-500'">
        {{ titulo }}
      </span>
      <MessageContent
        v-for="conteudo in conteudosRef"
        :key="`ref-${mensagem.id}-${conteudo.ordem}`"
        :conteudo="conteudo"
        :mensagem-id="referencia.id"
        :conversa-id="referencia.conversa_id"
        :is-own="isOwn"
        :get-anexo-url="getAnexoUrl"
        @open-image="(id, nome) => emit('open-image', id, nome)"
        @image-loaded="emit('image-loaded')"
        @download="(id, nome) => emit('download', id, nome)"
      />
    </div>

    <div class="px-2.5 py-0.5">
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

      <MensagemStatus
        :mensagem="mensagem"
        :is-own="isOwn"
        variante="padrao"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TipoMensagemReferencia, type Mensagem } from '../types/api'
import { obterReferenciaPrincipal, obterConteudosReferencia, tituloReferencia } from '../utils/messageReferences'
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
  'go-to-message': [mensagemId: number]
}>()

const referencia = computed(() => obterReferenciaPrincipal(props.mensagem))
const conteudosRef = computed(() => obterConteudosReferencia(props.mensagem))

const navegavel = computed(() => {
  return !!referencia.value && Number(referencia.value.tipo) === TipoMensagemReferencia.Resposta
})

const titulo = computed(() => {
  if (!referencia.value) return ''
  return tituloReferencia(referencia.value.tipo, referencia.value.remetente)
})

function abrirReferencia() {
  if (!referencia.value || !navegavel.value) return
  emit('go-to-message', referencia.value.id)
}
</script>
