<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-blue-50 p-1 md:p-4">
    <LoginForm v-if="!auth.isAuthenticated" @login-success="onLoginSuccess" />

    <div v-else class="flex h-[calc(100vh-0.5rem)] overflow-hidden rounded-xl bg-white shadow md:h-[calc(100vh-2rem)]">
      <ChatSidebar
        :sidebar-aberta="sidebarAberta"
        @update:sidebar-aberta="sidebarAberta = $event"
        @logout="sair"
        @open-group-modal="abrirModalGrupo = true"
        @conversation-opened="onConversationOpened"
      />

      <main
        class="relative flex-col overflow-hidden md:flex md:flex-1"
        :class="sidebarAberta ? 'hidden md:flex' : 'flex flex-1'"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
      >
        <!-- Overlay de Drag and Drop -->
        <div
          v-if="isDragging"
          class="absolute inset-0 z-50 flex items-center justify-center bg-blue-600/20 backdrop-blur-sm"
          @dragenter.prevent="onDragEnter"
          @dragover.prevent
          @drop.prevent="onDrop"
          @dragleave.prevent="onDragLeave"
        >
          <div class="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-blue-500 bg-white p-8 shadow-2xl">
            <div class="rounded-full bg-blue-100 p-4 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-12 w-12">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
            </div>
            <span class="text-xl font-semibold text-slate-800">Solte para enviar o arquivo</span>
            <span class="text-sm text-slate-500">Imagens mostrar\u00E3o uma pr\u00E9via antes de enviar</span>
          </div>
        </div>

        <CallBar
          v-if="call.emChamada"
          :janela-chamada-aberta="!!janelaChamada"
          @leave-call="sairDaChamadaAtual"
          @upgrade-video="upgradeParaVideoUI"
          @open-call-window="abrirJanelaChamada"
          @focus-call-window="janelaChamada?.focus()"
          @open-add-user-modal="modalAdicionarUsuario = true"
        />

        <ChatHeader
          v-if="chat.conversaAtiva"
          @update:sidebar-aberta="sidebarAberta = $event"
          @start-call="solicitarChamada"
          @go-to-message="messageListRef?.irParaMensagem($event)"
        />

        <MessageList
          v-if="chat.conversaAtiva"
          ref="messageListRef"
          @open-image="handleOpenImage"
        />

        <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
          <span>Selecione uma conversa para come&ccedil;ar.</span>
          <button class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 md:hidden" @click="sidebarAberta = true">
            Ver conversas
          </button>
        </div>

        <MessageInput
          v-if="chat.conversaAtiva"
          @message-sent="messageListRef?.rolarParaFinal()"
          @open-image-preview="abrirPreviewImagem"
        />
      </main>
    </div>

    <ImageViewerModal
      :aberta="imagemTelaCheiaAberta"
      :url="imagemTelaCheiaUrl"
      :nome="imagemTelaCheiaNome"
      :zoom="zoomImagemTelaCheia"
      :translate-x="translateX"
      :translate-y="translateY"
      :is-dragging="imagemIsDragging"
      @close="fecharImagemTelaCheia"
      @zoom-in="ajustarZoomImagem(0.2)"
      @zoom-out="ajustarZoomImagem(-0.2)"
      @zoom-wheel="zoomImagemPorRoda"
      @drag-start="iniciarArrasto"
      @drag-move="processarArrasto"
      @drag-end="finalizarArrasto"
    />

    <ImagePreviewModal
      :aberta="previewImagemAberta"
      :url="previewImagemUrl"
      :nome="previewImagemNome"
      @close="fecharPreviewImagem"
      @confirm="confirmarEnvioPreviewImagem"
    />

    <CreateGroupModal
      :aberta="abrirModalGrupo"
      @close="abrirModalGrupo = false"
      @created="onConversationOpened"
    />

    <CallParticipantsModal
      :aberta="modalParticipantesChamada"
      :tipo-chamada="tipoChamadaPendente"
      @close="cancelarModalParticipantes"
      @confirm="confirmarChamadaGrupo"
    />

    <IncomingCallModal
      @accept="aceitarChamadaRecebida"
      @reject="recusarChamadaRecebida"
    />

    <AddUserToCallModal
      :aberta="modalAdicionarUsuario"
      @close="modalAdicionarUsuario = false"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useCallStore } from './stores/call'
import type { TipoChamada } from './types/api'
import { useCallPopup } from './composables/useCallPopup'
import { useImageViewer } from './composables/useImageViewer'
import { useImagePreview } from './composables/useImagePreview'
import { useAttachments } from './composables/useAttachments'
import { useDragAndDrop } from './composables/useDragAndDrop'

import LoginForm from './components/LoginForm.vue'
import ChatSidebar from './components/ChatSidebar.vue'
import CallBar from './components/CallBar.vue'
import ChatHeader from './components/ChatHeader.vue'
import MessageList from './components/MessageList.vue'
import MessageInput from './components/MessageInput.vue'
import ImageViewerModal from './components/ImageViewerModal.vue'
import ImagePreviewModal from './components/ImagePreviewModal.vue'
import CreateGroupModal from './components/CreateGroupModal.vue'
import CallParticipantsModal from './components/CallParticipantsModal.vue'
import IncomingCallModal from './components/IncomingCallModal.vue'
import AddUserToCallModal from './components/AddUserToCallModal.vue'

const auth = useAuthStore()
const chat = useChatStore()
const call = useCallStore()

const erro = ref('')
const sidebarAberta = ref(true)
const abrirModalGrupo = ref(false)
const modalParticipantesChamada = ref(false)
const tipoChamadaPendente = ref<TipoChamada>(1)
const comTelaPendente = ref(false)
const modalAdicionarUsuario = ref(false)

const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

const { garantirAnexoUrl, anexosUrl, limparAnexos } = useAttachments()

const {
  janelaChamada,
  abrirJanelaChamada,
  sairDaChamadaAtual,
  upgradeParaVideoUI,
  pararToque,
  cleanup: cleanupCallPopup
} = useCallPopup(erro)

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
  finalizarArrasto
} = useImageViewer(garantirAnexoUrl, anexosUrl)

const {
  previewImagemAberta,
  previewImagemUrl,
  previewImagemNome,
  abrirPreviewImagem,
  fecharPreviewImagem,
  confirmarEnvioPreviewImagem,
  cleanup: cleanupImagePreview
} = useImagePreview(() => {
  messageListRef.value?.rolarParaFinal()
})

const { isDragging, onDragEnter, onDragLeave, onDragOver, onDrop } = useDragAndDrop(handleFilesDropped)

async function handleFilesDropped(files: FileList) {
  if (!chat.conversaAtiva) return

  for (const file of Array.from(files)) {
    const isImagem = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/')

    try {
      if (isImagem) {
        abrirPreviewImagem(file, file.name, file.type || 'image/png')
        // Se houver mais de um arquivo, paramos no primeiro se for imagem para mostrar o preview
        // Mas o ideal seria processar os demais se não fossem imagens.
        // Para simplificar, focamos no primeiro.
        break
      } else {
        await chat.enviarArquivo(file, file.name, file.type, isAudio)
      }
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Erro ao enviar arquivo'
    }
  }
  await nextTick()
  messageListRef.value?.rolarParaFinal()
}

onMounted(async () => {
  if (auth.isAuthenticated) {
    try {
      await chat.inicializar()
      chat.registrarHandlerChamada((evento) => {
        void call.tratarEventoChamada(evento)
      })
      void call.verificarChamadasPendentes()
      await messageListRef.value?.posicionarAberturaConversaAtiva()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao iniciar sess\u00E3o'
      erro.value = message
      auth.logout()
    }
  }
})

onUnmounted(() => {
  cleanupCallPopup()
  cleanupImagePreview()
  chat.removerHandlerChamada()
  call.encerrarChamada()
  chat.encerrarTempoReal()
  limparAnexos()
})

async function onLoginSuccess() {
  await messageListRef.value?.posicionarAberturaConversaAtiva()
}

function sair() {
  cleanupCallPopup()
  call.encerrarChamada()
  chat.removerHandlerChamada()
  chat.encerrarTempoReal()
  auth.logout()
}

async function onConversationOpened() {
  sidebarAberta.value = false
  await messageListRef.value?.posicionarAberturaConversaAtiva()
}

function solicitarChamada(tipo: TipoChamada, comTela = false) {
  if (!chat.conversaAtiva) return

  if (chat.conversaAtiva.tipo === 1 && chat.conversaAtiva.destinatario_id) {
    void iniciarChamadaDireta(tipo, chat.conversaAtiva.destinatario_id, comTela)
  } else if (chat.conversaAtiva.tipo === 2) {
    tipoChamadaPendente.value = tipo
    comTelaPendente.value = comTela
    modalParticipantesChamada.value = true
  }
}

async function iniciarChamadaDireta(tipo: TipoChamada, destinatarioId: number, comTela = false) {
  if (!auth.user) return
  try {
    await call.iniciarChamada(tipo, [{ id: auth.user.id }, { id: destinatarioId }], comTela)
    if (tipo === 2) abrirJanelaChamada()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao iniciar chamada'
  }
}

function cancelarModalParticipantes() {
  modalParticipantesChamada.value = false
  comTelaPendente.value = false
}

async function confirmarChamadaGrupo(participantes: number[]) {
  if (!auth.user || participantes.length === 0) return

  const usuarios = [
    { id: auth.user.id },
    ...participantes.map(id => ({ id }))
  ]

  modalParticipantesChamada.value = false

  try {
    await call.iniciarChamada(tipoChamadaPendente.value, usuarios, comTelaPendente.value)
    if (tipoChamadaPendente.value === 2) abrirJanelaChamada()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao iniciar chamada'
  }
}

async function aceitarChamadaRecebida() {
  pararToque()
  const tipo = call.tipoChamada
  try {
    await call.aceitarChamada()
    if (tipo === 2) abrirJanelaChamada()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao aceitar chamada'
  }
}

function recusarChamadaRecebida() {
  pararToque()
  void call.recusarChamada()
}

async function handleOpenImage(identificador: string, nome: string) {
  try {
    await abrirImagemTelaCheia(identificador, nome)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir imagem'
  }
}
</script>
