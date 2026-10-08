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

    <!-- Excluída: a citação não mostra o conteúdo (ele aparece segurando sobre a original) -->
    <p v-if="mensagemRef?.excluida_em" class="text-xs italic" :class="isOwn ? 'text-white/70' : 'text-surface-500'">Mensagem oculta</p>
    <!-- Referência aninhada (recursiva) -->
    <ReferenciaRecursiva
      v-if="mostraAninhada && mensagemRef?.mensagem_referencia"
      :referencia="mensagemRef.mensagem_referencia"
      :is-own="isOwn"
      :get-anexo-url="getAnexoUrl"
      :profundidade="profundidade + 1"
      @open-image="(id, nome) => emit('open-image', id, nome)"
      @image-loaded="emit('image-loaded')"
      @download="(id, nome) => emit('download', id, nome)"
      @go-to-message="(id, conversaId) => emit('go-to-message', id, conversaId)"
    />

    <MessageContent
      v-for="conteudo in conteudosExibidos"
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
import { semCopiasDaReferencia, tituloReferencia } from '../utils/messageReferences'
import { formatarHora } from '../utils/formatters'
import MessageContent from './MessageContent.vue'
import { useChatStore } from '../stores/chat'

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
  'go-to-message': [mensagemId: number, conversaId?: number]
}>()

const chat = useChatStore()

const mensagemRef = computed(() => props.referencia.mensagem)

// Com a citação de baixo à mostra, a cópia que a encaminhada leva dela não se repete
const mostraAninhada = computed(() => !mensagemRef.value?.excluida_em && !!mensagemRef.value?.mensagem_referencia?.mensagem && props.profundidade < 5)
const conteudosExibidos = computed(() => {
  const mensagem = mensagemRef.value
  if (!mensagem || mensagem.excluida_em) return []
  return mostraAninhada.value ? semCopiasDaReferencia(mensagem.conteudos || [], mensagem.mensagem_referencia) : mensagem.conteudos || []
})

// Encaminhada abre a conversa de origem, se o usuário participa dela
const navegavel = computed(() => {
  if (Number(props.referencia.tipo) === TipoMensagemReferencia.Resposta) return true
  return chat.conversas.some((c) => c.id === mensagemRef.value?.conversa_id)
})

const titulo = computed(() => {
  const remetente = mensagemRef.value?.remetente || 'Resposta'
  return tituloReferencia(Number(props.referencia.tipo), remetente)
})

function abrirReferencia() {
  if (!navegavel.value || !mensagemRef.value) return
  emit('go-to-message', mensagemRef.value.id, mensagemRef.value.conversa_id)
}
</script>
