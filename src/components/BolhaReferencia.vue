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
        <span v-if="referencia.inserida" class="font-normal">
          &middot; {{ formatarHora(referencia.inserida) }}
        </span>
      </span>

      <!-- Referência aninhada (recursiva) -->
      <ReferenciaRecursiva
        v-if="referenciaAninhada?.mensagem"
        :referencia="referenciaAninhada"
        :is-own="isOwn"
        :get-anexo-url="getAnexoUrl"
        :profundidade="1"
        @open-image="(id, nome) => emit('open-image', id, nome)"
        @image-loaded="emit('image-loaded')"
        @download="(id, nome) => emit('download', id, nome)"
        @go-to-message="(id) => emit('go-to-message', id)"
      />

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
        v-for="conteudo in conteudosProprios"
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
import { TipoMensagemReferencia, type Mensagem, type MensagemReferencia } from '../types/api'
import { obterReferenciaPrincipal, obterConteudosReferencia, tituloReferencia } from '../utils/messageReferences'
import { formatarHora } from '../utils/formatters'
import MessageContent from './MessageContent.vue'
import MensagemStatus from './MensagemStatus.vue'
import ReferenciaRecursiva from './ReferenciaRecursiva.vue'

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
const conteudosRefOriginal = computed(() => obterConteudosReferencia(props.mensagem))

const isEncaminhamento = computed(() =>
  Number(props.mensagem.mensagem_referencia?.tipo) === TipoMensagemReferencia.Encaminhada
)

// Para encaminhamentos: se a referência não tem conteúdo, usa os conteúdos próprios no bloco da referência
const conteudosRef = computed(() => {
  if (isEncaminhamento.value && conteudosRefOriginal.value.length === 0 && props.mensagem.conteudos.length > 0) {
    return props.mensagem.conteudos
  }
  return conteudosRefOriginal.value
})

const conteudosProprios = computed(() => {
  if (!isEncaminhamento.value) return props.mensagem.conteudos
  // Para encaminhamentos, oculta conteúdos próprios se já estão exibidos na referência
  const refConteudos = conteudosRef.value
  const proprios = props.mensagem.conteudos
  if (refConteudos.length === proprios.length && proprios.every((c, i) => c.conteudo === refConteudos[i]?.conteudo)) {
    return []
  }
  return proprios
})

const referenciaAninhada = computed((): MensagemReferencia | null => {
  return props.mensagem.mensagem_referencia?.mensagem?.mensagem_referencia || null
})

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
