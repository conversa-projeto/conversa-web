<template>
  <div v-if="chat.conversaAtiva" class="flex flex-col flex-1 min-h-0 bg-surface-100">
    <div
      class="flex-1 overflow-auto p-4 pb-2"
      ref="mensagensContainer"
      @scroll="aoScrollChat"
    >
      <div class="mx-auto w-full max-w-[1200px]">
        <div v-if="chat.carregando" class="text-center text-sm text-surface-500">Carregando mensagens...</div>

        <template v-for="item in itensMensagens" :key="item.key">
          <div v-if="item.tipo === 'dia'" class="my-3 flex justify-center">
            <span class="rounded-full bg-surface-200 px-3 py-1 text-xs text-surface-600">
              {{ item.label }}
            </span>
          </div>

          <MessageBubble
            v-else
            :mensagem="item.mensagem"
            :is-own="item.mensagem.remetente_id === auth.user?.id"
            :is-group="chat.conversaAtiva?.tipo === TipoConversa.Grupo"
            :get-anexo-url="anexoUrl"
            @open-image="(id, nome) => emit('open-image', id, nome)"
            @image-loaded="aoCarregarImagemNoChat"
            @download="(id, nome) => abrirAnexo(id, nome)"
            @reply="(msg) => chat.responderMensagem(msg)"
            @forward="(msg) => emit('forward', msg)"
            @go-to-message="(id) => irParaMensagem(id)"
          />
        </template>
      </div>
    </div>

    <!-- Indicador fixo na base -->
    <div class="shrink-0 bg-surface-100 px-4 pb-2">
      <div class="mx-auto flex h-5 w-full max-w-[1200px] items-end">
        <p v-if="textoGravando" class="animate-pulse text-xs text-danger-500">
          {{ textoGravando }}
        </p>
        <p v-else-if="textoDigitando" class="animate-pulse text-xs text-success-600">
          {{ textoDigitando }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { formatarDiaSeparador } from '../utils/formatters'
import { useScrollManager } from '../composables/useScrollManager'
import { useAttachments } from '../composables/useAttachments'
import MessageBubble from './MessageBubble.vue'
import { TipoConversa } from '../types/api'
import type { Mensagem } from '../types/api'

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'forward': [mensagem: Mensagem]
}>()

const auth = useAuthStore()
const chat = useChatStore()

const textoDigitando = computed(() => {
  const nomes = chat.digitandoNaConversaAtiva
  if (nomes.length === 0) return ''
  if (nomes.length === 1) return `${nomes[0]} esta digitando...`
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]} estao digitando...`
  return `${nomes[0]} e mais ${nomes.length - 1} estao digitando...`
})

const textoGravando = computed(() => {
  const nomes = chat.gravandoNaConversaAtiva
  if (nomes.length === 0) return ''
  if (nomes.length === 1) return `${nomes[0]} esta gravando audio...`
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]} estao gravando audio...`
  return `${nomes[0]} e mais ${nomes.length - 1} estao gravando audio...`
})

const {
  mensagensContainer,
  aoScrollChat,
  aoCarregarImagemNoChat,
  posicionarAberturaConversaAtiva,
  rolarParaFinal,
  irParaMensagem
} = useScrollManager()

const { anexoUrl, abrirAnexo, limparAnexos } = useAttachments()

type ItemMensagemView =
  | { tipo: 'dia'; key: string; label: string }
  | { tipo: 'mensagem'; key: string; mensagem: Mensagem }

const itensMensagens = computed<ItemMensagemView[]>(() => {
  const itens: ItemMensagemView[] = []
  let diaAtual = ''

  for (const mensagem of chat.mensagensAtivas) {
    const data = new Date(mensagem.inserida)
    const diaChave = Number.isNaN(data.getTime()) ? 'sem-data' : data.toISOString().slice(0, 10)

    if (diaChave !== diaAtual) {
      diaAtual = diaChave
      itens.push({
        tipo: 'dia',
        key: `dia-${diaChave}`,
        label: formatarDiaSeparador(mensagem.inserida)
      })
    }

    itens.push({
      tipo: 'mensagem',
      key: `msg-${mensagem.id}`,
      mensagem
    })
  }

  return itens
})

defineExpose({
  posicionarAberturaConversaAtiva,
  rolarParaFinal,
  irParaMensagem,
  limparAnexos
})
</script>
