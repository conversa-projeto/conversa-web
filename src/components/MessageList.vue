<template>
  <div v-if="chat.conversaAtiva" class="relative flex flex-col flex-1 min-h-0 bg-surface-100">
    <div
      class="flex-1 overflow-auto p-4"
      ref="mensagensContainer"
      @scroll="aoScrollChat"
    >
      <div v-if="chat.carregando && chat.mensagensAtivas.length === 0" class="absolute inset-0 flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <div class="flex gap-1.5">
            <span class="loader-dot h-3 w-3 rounded-full bg-primary-400" style="animation-delay: 0ms"></span>
            <span class="loader-dot h-3 w-3 rounded-full bg-primary-400" style="animation-delay: 150ms"></span>
            <span class="loader-dot h-3 w-3 rounded-full bg-primary-400" style="animation-delay: 300ms"></span>
          </div>
          <span class="text-sm text-surface-400">Carregando mensagens</span>
        </div>
      </div>

      <!-- Loading paginação: overlay absoluto, não ocupa espaço no fluxo -->
      <div v-if="carregandoHistorico" class="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
        <div class="flex items-center gap-2 rounded-full bg-surface-200 px-4 py-1.5 shadow">
          <svg class="h-4 w-4 animate-spin text-surface-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span class="text-xs text-surface-500">Carregando mensagens anteriores</span>
        </div>
      </div>

      <div class="mx-auto w-full max-w-[1200px]">

        <template v-for="item in itensMensagens" :key="item.key">
          <div v-if="item.tipo === 'dia'" class="my-3 flex justify-center">
            <span class="rounded-full bg-surface-200 px-3 py-1 text-xs text-surface-600">
              {{ item.label }}
            </span>
          </div>

          <div v-else-if="item.tipo === 'nao-lidas'" id="indicador-nao-lidas" class="my-3 flex justify-center">
            <span class="rounded-full bg-primary-600 px-3 py-1 text-xs text-white">
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
            @reagir="(mensagemId, emoji) => chat.reagirMensagem(mensagemId, emoji)"
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

    <!-- Indicador de novas mensagens recebidas -->
    <div v-if="haNovasMensagens" class="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
      <button
        class="pointer-events-auto flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-1.5 text-xs text-white shadow-lg transition-colors hover:bg-primary-700"
        @click="aoClicarNovasMensagens"
      >
        Há novas mensagens
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
          <path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 0 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
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
  distanteDoFinal,
  carregandoHistorico,
  haNovasMensagens,
  indicadorNaoLidasAtivo
} = useScrollManager()

const { anexoUrl, abrirAnexo, limparAnexos } = useAttachments()

// --- Indicador de mensagens não lidas ---
const indicadorNaoLidasVisivel = ref(false)
const qtdNaoLidasSnapshot = ref(0)
const primeiroIdNaoLidoSnapshot = ref<number | null>(null)
let timerIndicador: ReturnType<typeof setTimeout> | null = null

function limparIndicador() {
  indicadorNaoLidasVisivel.value = false
  qtdNaoLidasSnapshot.value = 0
  primeiroIdNaoLidoSnapshot.value = null
  if (timerIndicador) { clearTimeout(timerIndicador); timerIndicador = null }
}

function agendarTimerIndicador() {
  if (timerIndicador) clearTimeout(timerIndicador)
  timerIndicador = setTimeout(() => {
    timerIndicador = null
    if (document.hasFocus()) {
      const semVisualizar = chat.conversaAtiva?.mensagens_sem_visualizar || 0
      if (semVisualizar > 0) {
        agendarTimerIndicador()
      } else {
        indicadorNaoLidasVisivel.value = false
      }
    }
  }, 3000)
}

watch(() => chat.conversaAtivaId, () => limparIndicador())
watch(indicadorNaoLidasVisivel, (v) => { indicadorNaoLidasAtivo.value = v })

// Detectar nova mensagem do outro remetente adicionada no final do array
watch(
  () => {
    const msgs = chat.mensagensAtivas
    return msgs.length > 0 ? msgs[msgs.length - 1].id : 0
  },
  (ultimoId, anteriorId) => {
    if (!ultimoId || ultimoId === anteriorId) return
    const ultima = chat.mensagensAtivas[chat.mensagensAtivas.length - 1]
    if (!ultima || ultima.remetente_id === auth.user?.id) return

    // Se o navegador está focado e o scroll está no final, o usuário já vê a mensagem
    const container = mensagensContainer.value
    if (document.hasFocus() && container) {
      const distancia = container.scrollHeight - container.scrollTop - container.clientHeight
      if (distancia <= 500) return
    }

    // Nova mensagem do outro remetente — mostrar indicador
    const qtd = chat.conversaAtiva?.mensagens_sem_visualizar || 1
    qtdNaoLidasSnapshot.value = qtd
    // Travar posição do indicador na primeira mensagem não lida (só na primeira vez)
    if (!indicadorNaoLidasVisivel.value) {
      primeiroIdNaoLidoSnapshot.value = ultima.id
    }
    indicadorNaoLidasVisivel.value = true
    if (timerIndicador) clearTimeout(timerIndicador)
    agendarTimerIndicador()
  }
)

// --- Handler do botão "Há novas mensagens" ---
function aoClicarNovasMensagens() {
  rolarParaFinalAnimado()
  haNovasMensagens.value = false
}

type ItemMensagemView =
  | { tipo: 'dia'; key: string; label: string }
  | { tipo: 'nao-lidas'; key: string; label: string }
  | { tipo: 'mensagem'; key: string; mensagem: Mensagem; mudouRemetente: boolean }

const itensMensagens = computed<ItemMensagemView[]>(() => {
  const itens: ItemMensagemView[] = []
  let diaAtual = ''
  let ultimoRemetenteId: number | null = null
  const usuarioId = auth.user?.id
  let indicadorInserido = false

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

    // Inserir indicador de não lidas antes da primeira mensagem não lida
    if (indicadorNaoLidasVisivel.value && !indicadorInserido && mensagem.id === primeiroIdNaoLidoSnapshot.value) {
      indicadorInserido = true
      const qtd = chat.conversaAtiva?.mensagens_sem_visualizar || qtdNaoLidasSnapshot.value
      itens.push({
        tipo: 'nao-lidas',
        key: 'nao-lidas',
        label: qtd === 1 ? '1 mensagem não lida' : `${qtd} mensagens não lidas`
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

function aoFocarJanelaIndicador() {
  if (indicadorNaoLidasVisivel.value && !timerIndicador) {
    indicadorNaoLidasVisivel.value = false
  }
}

window.addEventListener('focus', aoFocarJanelaIndicador)

onBeforeUnmount(() => {
  window.removeEventListener('focus', aoFocarJanelaIndicador)
  if (timerIndicador) { clearTimeout(timerIndicador); timerIndicador = null }
})

async function posicionarEIndicar() {
  // Ativar indicador ANTES do posicionamento para que o DOM já inclua o indicador
  const usuarioId = auth.user?.id
  const primeiraNaoLida = chat.mensagensAtivas.find(m => m.remetente_id !== usuarioId && !m.visualizada)
  const qtd = chat.conversaAtiva?.mensagens_sem_visualizar || 0
  if (primeiraNaoLida && qtd > 0) {
    primeiroIdNaoLidoSnapshot.value = primeiraNaoLida.id
    qtdNaoLidasSnapshot.value = qtd
    indicadorNaoLidasVisivel.value = true
    agendarTimerIndicador()
  }
  await posicionarAberturaConversaAtiva()
}

defineExpose({
  posicionarAberturaConversaAtiva: posicionarEIndicar,
  rolarParaFinal,
  irParaMensagem,
  limparAnexos
})
</script>

<style scoped>
@keyframes loader-bounce {
  0% { transform: translateY(0); }
  30% { transform: translateY(-16px); }
  60%, 100% { transform: translateY(0); }
}
.loader-dot {
  animation: loader-bounce 1.2s ease-in-out infinite;
}
</style>
