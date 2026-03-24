<template>
  <div class="min-h-dvh" @contextmenu="bloquearContextMenu">
    <div v-if="erro" class="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-lg bg-danger-600 px-4 py-2 text-sm text-white shadow-lg">
      {{ erro }}
      <button class="ml-3 font-bold" @click="erro = ''">&times;</button>
    </div>

    <div v-if="!auth.isAuthenticated" class="chat-pattern min-h-dvh bg-surface-100">
      <RegisterForm v-if="telaCadastro" @go-login="telaCadastro = false" />
      <LoginForm v-else @login-success="onLoginSuccess" @go-register="telaCadastro = true" />
    </div>

    <div v-else class="relative flex h-dvh flex-col overflow-hidden bg-surface-base">
      <div
        v-if="mostrarAvisoDesconexao"
        class="flex shrink-0 items-center justify-center gap-2 bg-danger-600 px-3 py-1 text-xs font-medium text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
        </svg>
        Conexao em tempo real indisponivel — usando atualizacao periodica
      </div>
      <div class="relative flex flex-1 overflow-hidden">
      <ChatSidebar
        :sidebar-aberta="sidebarAberta"
        :ocultar-completa="mostrarConfiguracoes"
        @update:sidebar-aberta="sidebarAberta = $event"
        @logout="sair"
        @open-group-modal="abrirModalGrupo = true"
        @conversation-opened="onConversationOpened"
        @open-settings="abrirConfiguracoes"
      />

      <main
        class="relative flex-col overflow-hidden bg-surface-100 md:flex md:flex-1"
        :class="sidebarAberta && !mostrarConfiguracoes ? 'hidden md:flex' : 'flex flex-1'"
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
          v-if="chat.conversaAtiva && !mostrarChamadaNoPrincipal && !mostrarConfiguracoes"
          @update:sidebar-aberta="sidebarAberta = $event"
          @start-call="solicitarChamada"
          @go-to-message="abrirResultadoBusca"
          @open-group-members="modalMembrosGrupo = true"
        />

        <UploadIndicador v-if="chat.conversaAtiva && !mostrarChamadaNoPrincipal && !mostrarConfiguracoes" />

        <MessageList
          v-if="chat.conversaAtiva && !mostrarChamadaNoPrincipal && !mostrarConfiguracoes"
          ref="messageListRef"
          @open-image="handleOpenImage"
          @forward="abrirModalEncaminhamento"
        />

        <ProfileSettingsModal
          v-else-if="mostrarConfiguracoes && !mostrarChamadaNoPrincipal"
          :aberta="true"
          inline
          @close="fecharConfiguracoes"
        />

        <div v-else-if="!mostrarChamadaNoPrincipal" class="chat-pattern flex flex-1 flex-col items-center justify-center gap-3 bg-surface-100 text-surface-500">
          <span class="select-none">Selecione uma conversa.</span>
          <button class="rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 md:hidden" @click="sidebarAberta = true">
            Ver conversas
          </button>
        </div>

        <MessageInput
          ref="messageInputRef"
          v-if="chat.conversaAtiva && !mostrarChamadaNoPrincipal && !mostrarConfiguracoes"
          class="absolute inset-x-0 bottom-0 z-10"
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
import { useUploadProgress } from './composables/useUploadProgress'
import { ErroNaoAutenticado } from './services/http'

import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'
import ChatSidebar from './components/ChatSidebar.vue'
import CallBar from './components/CallBar.vue'
import ChatHeader from './components/ChatHeader.vue'
import ProfileSettingsModal from './components/ProfileSettingsModal.vue'
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
import UploadIndicador from './components/UploadIndicador.vue'

const auth = useAuthStore()
const chat = useChatStore()
const sip = useSipStore()
const call = useCallStore()
const { temUploadAtivo } = useUploadProgress()

function bloquearContextMenu(e: MouseEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if ((e.target as HTMLElement)?.isContentEditable) return
  e.preventDefault()
}

const erro = ref('')
const telaCadastro = ref(false)
const sidebarAberta = ref(!chat.conversaAtivaId)
const mostrarConfiguracoes = ref(false)
const abrirModalGrupo = ref(false)
const modalMembrosGrupo = ref(false)
const modalParticipantesChamada = ref(false)
const tipoChamadaPendente = ref<TipoChamada>(1)
const comTelaPendente = ref(false)
const modalAdicionarUsuario = ref(false)
const chamadaFlutuante = ref(false)
const mostrarAvisoDesconexao = ref(false)
let timerDesconexao: ReturnType<typeof setTimeout> | null = null

watch(() => chat.conectadoTempoReal, (conectado) => {
  if (conectado) {
    if (timerDesconexao) { clearTimeout(timerDesconexao); timerDesconexao = null }
    mostrarAvisoDesconexao.value = false
  } else if (auth.isAuthenticated) {
    if (!timerDesconexao) {
      timerDesconexao = setTimeout(() => {
        mostrarAvisoDesconexao.value = true
        timerDesconexao = null
      }, 5000)
    }
  }
})
const modalEncaminhamentoAberto = ref(false)
const mensagemParaEncaminhar = ref<Mensagem | null>(null)
const mostrarChamadaNoPrincipal = computed(() =>
  call.emChamada && call.tipoChamada === 2 && !chamadaFlutuante.value
)

const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)
const messageInputRef = ref<InstanceType<typeof MessageInput> | null>(null)

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
  finalizarArrasto,
  resetarZoomComTransicao,
  transicaoAtiva: imagemTransicaoAtiva
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

function handleFilesDropped(files: FileList) {
  if (!chat.conversaAtiva) return
  messageInputRef.value?.adicionarArquivosExternos(files)
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (temUploadAtivo.value) {
    e.preventDefault()
  }
}

onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload)
  if (auth.isAuthenticated) {
    try {
      await chat.inicializar()
      await sip.inicializarSessao(false)
      void auth.resolverAvatarUrl()
      chat.registrarHandlerChamada((evento: EventoChamadaSocket) => {
        void call.tratarEventoChamada(evento)
      })
      void call.verificarChamadasPendentes()
    } catch (e) {
      auth.logout()
      if (!(e instanceof ErroNaoAutenticado)) {
        erro.value = e instanceof Error ? e.message : 'Falha ao iniciar sessao'
      }
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  cleanupCallPopup()
  chat.removerHandlerChamada()
  call.encerrarChamada()
  chat.encerrarTempoReal()
  void sip.encerrar()
  limparAnexos()
})

function onLoginSuccess() {
  // Nenhuma conversa é selecionada automaticamente após login
}

function sair() {
  cleanupCallPopup()
  call.encerrarChamada()
  chat.removerHandlerChamada()
  chat.encerrarTempoReal()
  chat.conversaAtivaId = null
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
  mostrarConfiguracoes.value = false
  await messageListRef.value?.posicionarAberturaConversaAtiva()
}

function abrirConfiguracoes() {
  chat.conversaAtivaId = null
  mostrarConfiguracoes.value = true
  sidebarAberta.value = false
}

function fecharConfiguracoes() {
  mostrarConfiguracoes.value = false
  sidebarAberta.value = true
  void sip.inicializarSessao(true)
}

function solicitarChamada(tipo: TipoChamada, comTela = false) {
  if (!chat.conversaAtiva) return

  if (chat.conversaAtiva.tipo === TipoConversa.Direta && chat.conversaAtiva.destinatario_id) {
    void iniciarChamadaDireta(tipo, chat.conversaAtiva.destinatario_id, comTela)
  } else if (chat.conversaAtiva.tipo === TipoConversa.Grupo) {
    void iniciarChamadaGrupo(tipo, comTela)
  }
}

async function iniciarChamadaGrupo(tipo: TipoChamada, comTela = false) {
  if (!auth.user) return
  const membros = chat.usuariosConversaAtiva
  if (membros.length === 0) return
  const usuarios = membros.map(m => ({ id: m.usuario_id }))
  if (!usuarios.some(u => u.id === auth.user!.id)) {
    usuarios.unshift({ id: auth.user.id })
  }
  try {
    await call.iniciarChamada(tipo, usuarios, comTela)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao iniciar chamada'
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
      messageListRef.value?.ativarPaginacaoBidirecional()
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
