<template>
  <div
    class="border-l-4 px-2.5 py-0.5"
    :class="isOwn ? 'border-white/40 bg-white/[0.08]' : 'border-primary-400 bg-black/[0.06] dark:bg-white/[0.08]'"
  >
    <span
      class="text-[10px] font-semibold"
      :class="[isOwn ? 'text-white/70' : 'text-surface-500', navegavel ? 'cursor-pointer hover:opacity-80' : '']"
      @click.stop="abrirReferencia"
    >
      {{ titulo }}
      <span v-if="mensagemRef?.inserida" class="font-normal">
        &middot; {{ formatarHora(mensagemRef.inserida) }}
      </span>
    </span>

    <!-- Referência aninhada (recursiva) -->
    <ReferenciaRecursiva
      v-if="mensagemRef?.mensagem_referencia?.mensagem && profundidade < 5"
      :referencia="mensagemRef.mensagem_referencia"
      :is-own="isOwn"
      :get-anexo-url="getAnexoUrl"
      :profundidade="profundidade + 1"
      @open-image="(id, nome) => emit('open-image', id, nome)"
      @image-loaded="emit('image-loaded')"
      @download="(id, nome) => emit('download', id, nome)"
      @go-to-message="(id) => emit('go-to-message', id)"
    />

    <MessageContent
      v-for="conteudo in mensagemRef?.conteudos || []"
      :key="`ref-${profundidade}-${mensagemRef?.id}-${conteudo.ordem}`"
      :conteudo="conteudo"
      :mensagem-id="mensagemRef?.id ?? 0"
      :conversa-id="mensagemRef?.conversa_id"
      :is-own="isOwn"
      :get-anexo-url="getAnexoUrl"
      @open-image="(id, nome) => emit('open-image', id, nome)"
      @image-loaded="emit('image-loaded')"
      @download="(id, nome) => emit('download', id, nome)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TipoMensagemReferencia, type MensagemReferencia } from '../types/api'
import { tituloReferencia } from '../utils/messageReferences'
import { formatarHora } from '../utils/formatters'
import MessageContent from './MessageContent.vue'

const props = withDefaults(defineProps<{
  referencia: MensagemReferencia
  isOwn: boolean
  getAnexoUrl: (identificador: string) => string
  profundidade?: number
}>(), {
  profundidade: 0
})

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'image-loaded': []
  'download': [identificador: string, nome: string]
  'go-to-message': [mensagemId: number]
}>()

const mensagemRef = computed(() => props.referencia.mensagem)

const navegavel = computed(() => {
  return Number(props.referencia.tipo) === TipoMensagemReferencia.Resposta
})

const titulo = computed(() => {
  const remetente = mensagemRef.value?.remetente || 'Resposta'
  return tituloReferencia(Number(props.referencia.tipo), remetente)
})

function abrirReferencia() {
  if (!navegavel.value || !mensagemRef.value) return
  emit('go-to-message', mensagemRef.value.id)
}
</script>
