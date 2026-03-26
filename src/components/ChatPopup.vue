<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-surface-100">
    <div
      v-if="erro"
      class="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-lg bg-danger-600 px-4 py-2 text-sm text-white shadow-lg"
    >
      {{ erro }}
      <button class="ml-3 font-bold" @click="erro = ''">&times;</button>
    </div>

    <div v-if="carregando" class="flex flex-1 items-center justify-center text-surface-500">
      Carregando conversa...
    </div>

    <template v-else-if="chat.conversaAtiva">
      <ChatHeader
        :popout="true"
        @go-to-message="irParaMensagem"
      />

      <UploadIndicador />

      <MessageList
        ref="messageListRef"
        @open-image="handleOpenImage"
        @forward="abrirEncaminhamento"
      />

      <MessageInput
        ref="messageInputRef"
        class="absolute inset-x-0 bottom-0 z-10"
        @message-sent="messageListRef?.rolarParaFinal()"
        @open-image-preview="abrirPreviewImagem"
      />
    </template>

    <div v-else class="flex flex-1 items-center justify-center text-surface-500">
      Conversa nao encontrada.
    </div>

    <ImageViewerModal
      :aberta="imagemTelaCheiaAberta"
      :url="imagemTelaCheiaUrl"
      :nome="imagemTelaCheiaNome"
      :zoom="zoomImagemTelaCheia"
      :translate-x="translateX"
      :translate-y="translateY"
      :is-dragging="imagemIsDragging"
      :transicao-ativa="imagemTransicaoAtiva"
      @close="fecharImagemTelaCheia"
      @zoom-in="ajustarZoomImagem(1)"
      @zoom-out="ajustarZoomImagem(-1)"
      @zoom-wheel="zoomImagemPorRoda"
      @drag-start="iniciarArrasto"
      @drag-move="processarArrasto"
      @drag-end="finalizarArrasto"
      @reset-zoom="resetarZoomComTransicao"
      @copy="copiarImagemParaClipboard"
    />

    <ImagePreviewModal
      :aberta="previewImagemAberta"
      :url="previewImagemUrl"
      :nome="previewImagemNome"
      @close="fecharPreviewImagem"
      @confirm="confirmarEnvioPreviewImagem"
    />

    <ForwardMessageModal
      :aberta="modalEncaminhamentoAberto"
      :mensagem="mensagemParaEncaminhar"
      @close="fecharEncaminhamento"
      @select-conversation="encaminharParaConversa"
      @select-contact="encaminharParaContato"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useTheme } from '../composables/useTheme'
import { useAttachments } from '../composables/useAttachments'
import { useImageViewer } from '../composables/useImageViewer'
import { useImagePreview } from '../composables/useImagePreview'
import ChatHeader from './ChatHeader.vue'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'
import UploadIndicador from './UploadIndicador.vue'
import ImageViewerModal from './ImageViewerModal.vue'
import ImagePreviewModal from './ImagePreviewModal.vue'
import ForwardMessageModal from './ForwardMessageModal.vue'
import type { Contato, Mensagem } from '../types/api'

const props = defineProps<{ conversaId: number }>()

const auth = useAuthStore()
const chat = useChatStore()

// Aplica o tema (dark/light) salvo no localStorage
useTheme()

const erro = ref('')
const carregando = ref(true)

const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)
const messageInputRef = ref<InstanceType<typeof MessageInput> | null>(null)

// Anexos e imagem
const { garantirAnexoUrl, anexosUrl } = useAttachments()

const {
  imagemTelaCheiaAberta,
  imagemTelaCheiaUrl,
  imagemTelaCheiaNome,
  zoomImagemTelaCheia,
  translateX,
  translateY,
  isDragging: imagemIsDragging,
  abrirImagemTelaCheia,
  fecharImagemTelaCheia,
  ajustarZoomImagem,
  zoomImagemPorRoda,
  iniciarArrasto,
  processarArrasto,
  finalizarArrasto,
  resetarZoomComTransicao,
  transicaoAtiva: imagemTransicaoAtiva,
  copiarImagemParaClipboard
} = useImageViewer(garantirAnexoUrl, anexosUrl)

const {
  previewImagemAberta,
  previewImagemUrl,
  previewImagemNome,
  abrirPreviewImagem,
  fecharPreviewImagem,
  confirmarEnvioPreviewImagem,
} = useImagePreview(() => {
  messageListRef.value?.rolarParaFinal()
})

// Encaminhamento
const modalEncaminhamentoAberto = ref(false)
const mensagemParaEncaminhar = ref<Mensagem | null>(null)

function abrirEncaminhamento(msg: Mensagem) {
  mensagemParaEncaminhar.value = msg
  modalEncaminhamentoAberto.value = true
}

function fecharEncaminhamento() {
  modalEncaminhamentoAberto.value = false
  mensagemParaEncaminhar.value = null
}

async function encaminharParaConversa(conversaId: number) {
  if (!mensagemParaEncaminhar.value) return
  try {
    await chat.encaminharMensagemParaConversa(mensagemParaEncaminhar.value, conversaId)
    fecharEncaminhamento()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao encaminhar mensagem'
  }
}

async function encaminharParaContato(contato: Contato) {
  if (!mensagemParaEncaminhar.value) return
  try {
    await chat.encaminharMensagemParaContato(mensagemParaEncaminhar.value, contato)
    fecharEncaminhamento()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao encaminhar mensagem'
  }
}

async function handleOpenImage(identificador: string, nome: string) {
  try {
    await abrirImagemTelaCheia(identificador, nome)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir imagem'
  }
}

function irParaMensagem(id: number) {
  messageListRef.value?.irParaMensagem(id)
}

// Atualizar título da janela com nome da conversa
watch(() => chat.conversaAtiva, (conversa) => {
  if (conversa) {
    document.title = conversa.descricao || conversa.nome || 'Conversa'
  }
}, { immediate: true })

// Inicialização
onMounted(async () => {
  if (!auth.isAuthenticated) {
    erro.value = 'Sessao expirada. Faca login novamente.'
    carregando.value = false
    return
  }

  try {
    await chat.inicializar()
    await chat.selecionarConversa(props.conversaId)

    await nextTick()
    messageListRef.value?.posicionarAberturaConversaAtiva()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar conversa'
  } finally {
    carregando.value = false
  }
})
</script>
