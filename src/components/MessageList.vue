<template>
  <div v-if="chat.conversaAtiva" class="relative flex flex-col flex-1 min-h-0 bg-surface-100">
    <div
      class="flex-1 overflow-auto p-4"
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
            :mudou-remetente="item.mudouRemetente"
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

    <!-- Botão rolar para o final -->
    <div v-if="distanteDoFinal" class="pointer-events-none absolute inset-x-0 bottom-4 z-20 px-4">
      <div class="mx-auto w-full max-w-[1200px]">
        <button
          class="pointer-events-auto float-right flex h-9 w-9 items-center justify-center rounded-full border border-surface-300 bg-surface-base text-surface-500 shadow-md transition hover:bg-surface-200 hover:text-surface-700"
          title="Ir para o final"
          @click="rolarParaFinalAnimado()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
            <path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 0 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" />
          </svg>
        </button>
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

const {
  mensagensContainer,
  aoScrollChat,
  aoCarregarImagemNoChat,
  posicionarAberturaConversaAtiva,
  rolarParaFinal,
  rolarParaFinalAnimado,
  irParaMensagem,
  usuarioNoFimDoChat,
  distanteDoFinal
} = useScrollManager()

const { anexoUrl, abrirAnexo, limparAnexos } = useAttachments()

type ItemMensagemView =
  | { tipo: 'dia'; key: string; label: string }
  | { tipo: 'mensagem'; key: string; mensagem: Mensagem; mudouRemetente: boolean }

const itensMensagens = computed<ItemMensagemView[]>(() => {
  const itens: ItemMensagemView[] = []
  let diaAtual = ''
  let ultimoRemetenteId: number | null = null

  for (const mensagem of chat.mensagensAtivas) {
    const data = new Date(mensagem.inserida)
    const diaChave = Number.isNaN(data.getTime()) ? 'sem-data' : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`

    if (diaChave !== diaAtual) {
      diaAtual = diaChave
      ultimoRemetenteId = null
      itens.push({
        tipo: 'dia',
        key: `dia-${diaChave}`,
        label: formatarDiaSeparador(mensagem.inserida)
      })
    }

    const mudouRemetente = ultimoRemetenteId !== null && mensagem.remetente_id !== ultimoRemetenteId
    ultimoRemetenteId = mensagem.remetente_id

    itens.push({
      tipo: 'mensagem',
      key: `msg-${mensagem.id}`,
      mensagem,
      mudouRemetente
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
