<template>
  <div class="min-h-screen">
    <div v-if="erro" class="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-lg bg-danger-600 px-4 py-2 text-sm text-white shadow-lg">
      {{ erro }}
      <button class="ml-3 font-bold" @click="erro = ''">&times;</button>
    </div>

    <template v-if="!auth.isAuthenticated">
      <RegisterForm v-if="telaCadastro" @go-login="telaCadastro = false" />
      <LoginForm v-else @login-success="onLoginSuccess" @go-register="telaCadastro = true" />
    </template>

    <div v-else class="relative flex h-screen overflow-hidden bg-surface-base">
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
        <div
          v-if="isDragging"
          class="absolute inset-0 z-50 flex items-center justify-center bg-primary-600/20 backdrop-blur-sm"
          @dragenter.prevent="onDragEnter"
          @dragover.prevent
          @drop.prevent="onDrop"
          @dragleave.prevent="onDragLeave"
        >
          <div class="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-primary-500 bg-surface-base p-8 shadow-2xl">
            <div class="rounded-full bg-primary-100 p-4 text-primary-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-12 w-12">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
            </div>
            <span class="text-xl font-semibold text-surface-800">Solte para enviar o arquivo</span>
            <span class="text-sm text-surface-500">Imagens mostrarao uma previa antes de enviar</span>
          </div>
        </div>

        <CallBar
          v-if="call.emChamada && !mostrarChamadaNoPrincipal"
          @leave-call="sairDaChamadaAtual"
          @upgrade-video="upgradeParaVideoUI"
          @show-call-window="chamadaFlutuante = false"
          @open-add-user-modal="modalAdicionarUsuario = true"
        />

        <ChatHeader
          v-if="chat.conversaAtiva && !mostrarChamadaNoPrincipal"
          @update:sidebar-aberta="sidebarAberta = $event"
          @start-call="solicitarChamada"
          @go-to-message="abrirResultadoBusca"
          @open-group-members="modalMembrosGrupo = true"
        />

        <MessageList
          v-if="chat.conversaAtiva && !mostrarChamadaNoPrincipal"
          ref="messageListRef"
          @open-image="handleOpenImage"
          @forward="abrirModalEncaminhamento"
        />

        <div v-else-if="!mostrarChamadaNoPrincipal" class="flex flex-1 flex-col items-center justify-center gap-3 text-surface-500">
          <span>Selecione uma conversa para comecar.</span>
          <button class="rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 md:hidden" @click="sidebarAberta = true">
            Ver conversas
          </button>
        </div>

        <MessageInput
          v-if="chat.conversaAtiva && !mostrarChamadaNoPrincipal"
          @message-sent="messageListRef?.rolarParaFinal()"
          @open-image-preview="abrirPreviewImagem"
        />
      </main>

      <CallWindow
        v-if="mostrarChamadaNoPrincipal"
        :fechar-ao-encerrar="false"
        class="fixed inset-0 z-20"
        @toggle-float="chamadaFlutuante = true"
      />

      <CallWindow
        v-if="chamadaFlutuante && call.emChamada && call.tipoChamada === 2"
        :fechar-ao-encerrar="false"
        :flutuante="true"
        @toggle-float="chamadaFlutuante = false"
      />
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

    <GroupMembersModal
      :aberta="modalMembrosGrupo"
      @close="modalMembrosGrupo = false"
    />

    <ForwardMessageModal
      :aberta="modalEncaminhamentoAberto"
      :mensagem="mensagemParaEncaminhar"
      @close="fecharModalEncaminhamento"
      @select-conversation="encaminharParaConversa"
      @select-contact="encaminharParaContato"
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

    <VideoUpgradeModal />

    <AddUserToCallModal
      :aberta="modalAdicionarUsuario"
      @close="modalAdicionarUsuario = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useSipStore } from './stores/sip'
import { useCallStore } from './stores/call'
import { TipoConversa } from './types/api'
import type { Contato, EventoChamadaSocket, Mensagem, TipoChamada } from './types/api'
import { useCallPopup } from './composables/useCallPopup'
import { useImageViewer } from './composables/useImageViewer'
import { useImagePreview } from './composables/useImagePreview'
import { useAttachments } from './composables/useAttachments'
import { useDragAndDrop } from './composables/useDragAndDrop'

import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'
import ChatSidebar from './components/ChatSidebar.vue'
import CallBar from './components/CallBar.vue'
import ChatHeader from './components/ChatHeader.vue'
import MessageList from './components/MessageList.vue'
import MessageInput from './components/MessageInput.vue'
import ImageViewerModal from './components/ImageViewerModal.vue'
import ImagePreviewModal from './components/ImagePreviewModal.vue'
import CreateGroupModal from './components/CreateGroupModal.vue'
import GroupMembersModal from './components/GroupMembersModal.vue'
import ForwardMessageModal from './components/ForwardMessageModal.vue'
import CallParticipantsModal from './components/CallParticipantsModal.vue'
import IncomingCallModal from './components/IncomingCallModal.vue'
import VideoUpgradeModal from './components/VideoUpgradeModal.vue'
import AddUserToCallModal from './components/AddUserToCallModal.vue'
import CallWindow from './CallWindow.vue'

const auth = useAuthStore()
const chat = useChatStore()
const sip = useSipStore()
const call = useCallStore()

const erro = ref('')
const telaCadastro = ref(false)
const sidebarAberta = ref(true)
const abrirModalGrupo = ref(false)
const modalMembrosGrupo = ref(false)
const modalParticipantesChamada = ref(false)
const tipoChamadaPendente = ref<TipoChamada>(1)
const comTelaPendente = ref(false)
const modalAdicionarUsuario = ref(false)
const chamadaFlutuante = ref(false)
const modalEncaminhamentoAberto = ref(false)
const mensagemParaEncaminhar = ref<Mensagem | null>(null)
const mostrarChamadaNoPrincipal = computed(() =>
  call.emChamada && call.tipoChamada === 2 && !chamadaFlutuante.value
)

const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

const { garantirAnexoUrl, anexosUrl, limparAnexos } = useAttachments()

const {
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
      await sip.inicializarSessao(false)
      void auth.resolverAvatarUrl()
      chat.registrarHandlerChamada((evento: EventoChamadaSocket) => {
        void call.tratarEventoChamada(evento)
      })
      void call.verificarChamadasPendentes()
      await messageListRef.value?.posicionarAberturaConversaAtiva()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao iniciar sessao'
      erro.value = message
      auth.logout()
    }
  }
})

onUnmounted(() => {
  cleanupCallPopup()
  chat.removerHandlerChamada()
  call.encerrarChamada()
  chat.encerrarTempoReal()
  void sip.encerrar()
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
  void sip.encerrar()
  auth.logout()
}

function abrirModalEncaminhamento(mensagem: Mensagem) {
  mensagemParaEncaminhar.value = mensagem
  modalEncaminhamentoAberto.value = true
}

function fecharModalEncaminhamento() {
  modalEncaminhamentoAberto.value = false
  mensagemParaEncaminhar.value = null
}

async function onConversationOpened() {
  sidebarAberta.value = false
  await messageListRef.value?.posicionarAberturaConversaAtiva()
}

function solicitarChamada(tipo: TipoChamada, comTela = false) {
  if (!chat.conversaAtiva) return

  if (chat.conversaAtiva.tipo === TipoConversa.Direta && chat.conversaAtiva.destinatario_id) {
    void iniciarChamadaDireta(tipo, chat.conversaAtiva.destinatario_id, comTela)
  } else if (chat.conversaAtiva.tipo === TipoConversa.Grupo) {
    tipoChamadaPendente.value = tipo
    comTelaPendente.value = comTela
    modalParticipantesChamada.value = true
  }
}

async function iniciarChamadaDireta(tipo: TipoChamada, destinatarioId: number, comTela = false) {
  if (!auth.user) return
  try {
    await call.iniciarChamada(tipo, [{ id: auth.user.id }, { id: destinatarioId }], comTela)
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
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao iniciar chamada'
  }
}

async function aceitarChamadaRecebida() {
  pararToque()
  chamadaFlutuante.value = false
  try {
    await call.aceitarChamada()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao aceitar chamada'
  }
}

function recusarChamadaRecebida() {
  pararToque()
  void call.recusarChamada()
}

async function abrirResultadoBusca(mensagemId: number) {
  const conversaId = chat.conversaAtivaId
  if (!conversaId) return

  try {
    const ok = await chat.carregarContextoMensagem(conversaId, mensagemId, 30, 30)
    await nextTick()
    if (ok) {
      messageListRef.value?.irParaMensagem(mensagemId)
    } else {
      erro.value = 'Nao foi possivel localizar esta mensagem no contexto da conversa.'
    }
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir resultado da pesquisa'
  }
}

async function handleOpenImage(identificador: string, nome: string) {
  try {
    await abrirImagemTelaCheia(identificador, nome)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir imagem'
  }
}

async function encaminharParaConversa(conversaId: number) {
  if (!mensagemParaEncaminhar.value) return

  try {
    await chat.encaminharMensagemParaConversa(mensagemParaEncaminhar.value, conversaId)
    fecharModalEncaminhamento()
    await nextTick()
    await messageListRef.value?.posicionarAberturaConversaAtiva()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao encaminhar mensagem'
  }
}

async function encaminharParaContato(contato: Contato) {
  if (!mensagemParaEncaminhar.value) return

  try {
    await chat.encaminharMensagemParaContato(mensagemParaEncaminhar.value, contato)
    fecharModalEncaminhamento()
    await nextTick()
    await messageListRef.value?.posicionarAberturaConversaAtiva()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao encaminhar mensagem'
  }
}
</script>
