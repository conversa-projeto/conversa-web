<template>
  <div v-if="chat.conversaAtiva" class="chat-pattern relative flex flex-col flex-1 min-h-0 bg-surface-100">
    <div
      class="flex-1 overflow-y-auto px-3 pt-4 pb-6"
      ref="mensagensContainer"
      @scroll="aoScrollChatComAncora"
    >
      <div v-if="chat.carregando && chat.mensagensAtivas.length === 0" class="absolute inset-0 flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <div class="flex gap-1.5">
            <span class="loader-dot h-3 w-3 rounded-full bg-primary-400" style="animation-delay: 0ms"></span>
            <span class="loader-dot h-3 w-3 rounded-full bg-primary-400" style="animation-delay: 150ms"></span>
            <span class="loader-dot h-3 w-3 rounded-full bg-primary-400" style="animation-delay: 300ms"></span>
          </div>
          <span class="text-sm text-surface-600">Carregando mensagens</span>
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

      <div ref="conteudoMensagens" class="mx-auto w-full max-w-[850px] pl-5">

        <template v-for="item in itensMensagens" :key="item.key">
          <div v-if="item.tipo === 'dia'" class="my-3 flex justify-center">
            <span class="rounded-full bg-surface-300 px-3 py-1 text-xs text-surface-700 dark:bg-surface-200 dark:text-surface-500">
              {{ item.label }}
            </span>
          </div>

          <div v-else-if="item.tipo === 'nao-lidas'" id="indicador-nao-lidas" class="my-2 flex items-center gap-2 text-[11px] font-medium text-primary-500">
            <span class="h-px flex-1 bg-primary-500/60"></span>
            {{ item.label }}
            <span class="h-px flex-1 bg-primary-500/60"></span>
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
            @excluir="excluirMensagem"
          />
        </template>
      </div>

      <!-- Loading paginação para baixo -->
      <div v-if="carregandoSeguintes" class="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
        <div class="flex items-center gap-2 rounded-full bg-surface-200 px-4 py-1.5 shadow">
          <svg class="h-4 w-4 animate-spin text-surface-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span class="text-xs text-surface-500">Carregando mensagens seguintes</span>
        </div>
      </div>
    </div>

    <!-- Botão rolar para o final -->
    <div v-if="distanteDoFinal" class="pointer-events-none absolute inset-x-0 bottom-4 z-20 px-4">
      <div class="mx-auto w-full max-w-[850px] pl-5">
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
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { formatarDiaSeparador } from '../utils/formatters'
import { useScrollManager } from '../composables/useScrollManager'
import { useAttachments } from '../composables/useAttachments'
import MessageBubble from './MessageBubble.vue'
import { TipoConversa } from '../types/api'
import type { Mensagem } from '../types/api'

const { alturaCampoMensagem = 0 } = defineProps<{
  alturaCampoMensagem?: number
}>()

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'forward': [mensagem: Mensagem]
  'ancora-changed': [ancora: import('../composables/useHistoryNavigation').AncoraScroll | null]
  'at-bottom-changed': [noFim: boolean]
}>()

const auth = useAuthStore()
const chat = useChatStore()

const {
  mensagensContainer,
  conteudoMensagens,
  aoScrollChat,
  aoCarregarImagemNoChat,
  posicionarAberturaConversaAtiva,
  rolarParaFinal,
  rolarParaFinalAnimado,
  irParaMensagem,
  distanteDoFinal,
  carregandoHistorico,
  carregandoSeguintes,
  haNovasMensagens,
  indicadorNaoLidasAtivo,
  ativarPaginacaoBidirecional,
  capturarAncora,
  restaurarAncora,
  usuarioNoFimDoChat
} = useScrollManager()

// Propagar mudancas de usuarioNoFimDoChat para o pai (App.vue) — usado pelo
// MessageInput para decidir se mostra o indicador "digitando/gravando" acima
// do campo de mensagem.
watch(usuarioNoFimDoChat, (val) => {
  emit('at-bottom-changed', val)
}, { immediate: true })

async function excluirMensagem(msg: Mensagem) {
  const agendada = !!msg.visivel_em && new Date(msg.visivel_em).getTime() > Date.now()
  const confirmacao = agendada
    ? 'Cancelar esta mensagem agendada?'
    : 'Excluir esta mensagem? Esta ação não pode ser desfeita.'
  if (!window.confirm(confirmacao)) return
  try {
    await chat.excluirMensagem(msg.id)
  } catch (e) {
    window.alert(e instanceof Error ? e.message : 'Erro ao excluir mensagem')
  }
}

// Debounce para captura de âncora: em cada scroll, aguarda 200ms
// de inatividade antes de emitir, evitando overhead durante scroll rápido.
let timerAncora = 0
function aoScrollChatComAncora() {
  aoScrollChat()
  if (timerAncora) window.clearTimeout(timerAncora)
  timerAncora = window.setTimeout(() => {
    timerAncora = 0
    emit('ancora-changed', capturarAncora())
  }, 200)
}
onBeforeUnmount(() => {
  if (timerAncora) window.clearTimeout(timerAncora)
})

const { anexoUrl, renovarAnexoUrl, abrirAnexo, limparAnexos } = useAttachments()

provide('renovarAnexoUrl', renovarAnexoUrl)

// =====================================================================
// INDICADOR DE MENSAGENS NÃO LIDAS
//
// O indicador é a linha "---- Últimas ----" que aparece DENTRO do
// chat, posicionada entre as mensagens, logo acima da primeira não lida.
//
// === REGRAS FUNDAMENTAIS (NÃO QUEBRAR) ===
//
// 1. POSIÇÃO FIXA NA PRIMEIRA APARIÇÃO:
//    O primeiroIdNaoLidoSnapshot é definido UMA ÚNICA VEZ quando o
//    indicador aparece pela primeira vez. Novas mensagens que chegam
//    NÃO movem a posição do indicador — ele permanece fixo acima da
//    mensagem onde apareceu originalmente. A exceção é a regra 2.
//
// 2. PERMANECE ENQUANTO A CONVERSA ESTIVER ABERTA:
//    O indicador não some sozinho, nem depois de tudo visualizado:
//    sumir no meio da leitura faz o texto pular. Ele só sai ao trocar
//    de conversa. Se a janela perder o foco e chegar mensagem nova,
//    ele passa para cima dessa mensagem (o lote anterior já foi lido).
//
// 3. AUTO-SCROLL NÃO DEVE ESCONDER O INDICADOR:
//    Quando uma nova mensagem chega e o scroll deveria ir para o final,
//    o useScrollManager verifica se isso empurraria o indicador para
//    fora da viewport. Se sim, o scroll NÃO acontece. Essa verificação
//    está no watch de mensagens e no watch de carregamento do
//    useScrollManager.ts, usando o ref indicadorNaoLidasAtivo. Ele só
//    fica ativo enquanto ainda há mensagens sem visualizar: depois
//    disso o indicador continua na tela, mas não segura mais o scroll.
//
// 4. ABERTURA DE CONVERSA COM NÃO LIDAS:
//    Ao abrir um chat que já tem mensagens não lidas, o indicador é
//    ativado ANTES do posicionamento (em posicionarEIndicar), para que
//    o DOM já contenha o elemento e o scroll possa posicionar na
//    primeira não lida corretamente.
//
// 5. TROCA DE CONVERSA LIMPA TUDO:
//    Ao trocar de conversa (watch conversaAtivaId), todos os estados
//    do indicador são resetados (visibilidade e posição).
//
// === FLUXO DO INDICADOR ===
//
// Cenário A — Nova mensagem em tempo real (navegador sem foco ou longe do final):
//   1. Watch detecta novo ultimoId do outro remetente
//   2. Se navegador focado e perto do final (≤500px) → ignora (usuário já vê)
//   3. Se indicador ainda não visível, ou se a janela perdeu o foco
//      desde a última vez → trava primeiroIdNaoLidoSnapshot no ID
//   4. Ativa indicadorNaoLidasVisivel = true
//
// Cenário B — Abertura de chat com não lidas:
//   1. posicionarEIndicar() encontra a primeira mensagem não lida
//   2. Ativa o indicador nessa posição
//   3. Chama posicionarAberturaConversaAtiva() que posiciona o scroll
//
// Cenário C — Janela perde o foco:
//   1. Marca reposicionarIndicador = true
//   2. A próxima mensagem recebida move o indicador para cima dela
//
// === COMUNICAÇÃO COM useScrollManager ===
//
// O ref indicadorNaoLidasAtivo (do useScrollManager) fica ligado
// enquanto o indicador está visível E ainda há não lidas. Isso
// permite que o useScrollManager verifique, antes de fazer auto-scroll,
// se o elemento DOM #indicador-nao-lidas seria empurrado para fora da
// viewport. Se seria, o auto-scroll é cancelado.
//
// === RENDERIZAÇÃO NO TEMPLATE ===
//
// O computed itensMensagens insere o item { tipo: 'nao-lidas' } no
// array de renderização ANTES da mensagem cujo ID === primeiroIdNaoLidoSnapshot.
// =====================================================================

/** Controla se o indicador "Últimas" está visível no chat */
const indicadorNaoLidasVisivel = ref(false)

/**
 * ID da mensagem onde o indicador está posicionado.
 * Definido UMA VEZ quando o indicador aparece pela primeira vez.
 * Novas mensagens NÃO alteram esta posição — apenas o contador atualiza.
 */
const primeiroIdNaoLidoSnapshot = ref<number | null>(null)

/**
 * A janela perdeu o foco depois que o indicador apareceu: a próxima mensagem
 * recebida é o começo de um novo lote não lido, e o indicador vai para ela.
 */
let reposicionarIndicador = false

/**
 * Reseta todos os estados do indicador.
 * Chamado ao trocar de conversa para evitar vazamento entre chats.
 */
function limparIndicador() {
  indicadorNaoLidasVisivel.value = false
  primeiroIdNaoLidoSnapshot.value = null
  reposicionarIndicador = false
}

// O campo de mensagem fica abaixo da lista. Quando ele cresce (resposta,
// anexos, varias linhas), a lista encolhe; ela rola junto para as ultimas
// mensagens que estavam visiveis continuarem visiveis.
watch(() => alturaCampoMensagem, async (nova, antiga) => {
  await nextTick()
  if (mensagensContainer.value) mensagensContainer.value.scrollTop += nova - antiga
})

/** Ao trocar de conversa, limpar todo o estado do indicador */
watch(() => chat.conversaAtivaId, () => limparIndicador())

/**
 * Manter o ref do useScrollManager sincronizado com o estado local.
 * O useScrollManager usa indicadorNaoLidasAtivo para decidir se deve
 * cancelar auto-scroll que empurraria o indicador para fora da viewport.
 */
watch(
  () => indicadorNaoLidasVisivel.value && (chat.conversaAtiva?.mensagens_sem_visualizar || 0) > 0,
  (v) => { indicadorNaoLidasAtivo.value = v },
  { immediate: true }
)

/**
 * Watch que detecta novas mensagens do outro remetente em tempo real.
 *
 * Observa o ID da última mensagem no array. Quando muda:
 * 1. Ignora mensagens próprias (remetente_id === user.id)
 * 2. Se o navegador está focado E o scroll está perto do final (≤500px),
 *    o usuário já vê a mensagem → não mostrar indicador
 * 3. Caso contrário, ativar/atualizar o indicador:
 *    - Na PRIMEIRA ativação: travar primeiroIdNaoLidoSnapshot (posição fixa)
 *    - Em ativações subsequentes: apenas atualizar o contador
 */
watch(
  () => {
    const msgs = chat.mensagensAtivas
    return msgs.length > 0 ? msgs[msgs.length - 1].id : 0
  },
  (ultimoId, anteriorId) => {
    if (!ultimoId || ultimoId === anteriorId) return
    // Ignorar mudanças de ID causadas por paginação (carregar histórico ou seguintes)
    if (carregandoHistorico.value || carregandoSeguintes.value) return
    const ultima = chat.mensagensAtivas[chat.mensagensAtivas.length - 1]
    if (!ultima || ultima.remetente_id === auth.user?.id) return

    // Se o navegador está focado e o scroll está perto do final,
    // o usuário já consegue ver a mensagem — não precisa de indicador
    const container = mensagensContainer.value
    if (document.hasFocus() && container) {
      const distancia = container.scrollHeight - container.scrollTop - container.clientHeight
      if (distancia <= 500) return
    }

    // POSIÇÃO FIXA: só definir na primeira vez que o indicador aparece,
    // ou no primeiro recebimento depois que a janela perdeu o foco.
    if (!indicadorNaoLidasVisivel.value || reposicionarIndicador) {
      primeiroIdNaoLidoSnapshot.value = ultima.id
      reposicionarIndicador = false
    }

    indicadorNaoLidasVisivel.value = true
  }
)

/**
 * Handler do botão flutuante "Há novas mensagens" (haNovasMensagens).
 *
 * NOTA: Este botão é diferente do indicador "X mensagens não lidas".
 * - "Há novas mensagens" (haNovasMensagens) → botão flutuante no rodapé,
 *   controlado pelo useScrollManager quando o usuário está longe do final
 * - "X mensagens não lidas" (indicadorNaoLidasVisivel) → barra inserida
 *   entre as mensagens no chat, controlada localmente neste componente
 */
function aoClicarNovasMensagens() {
  rolarParaFinalAnimado()
  haNovasMensagens.value = false
}

/**
 * Tipos de item que podem ser renderizados na lista de mensagens.
 * - 'dia': separador de data (ex: "Hoje", "Ontem", "22/03/2026")
 * - 'nao-lidas': indicador "X mensagens não lidas" posicionado acima da primeira não lida
 * - 'mensagem': uma mensagem do chat
 */
type ItemMensagemView =
  | { tipo: 'dia'; key: string; label: string }
  | { tipo: 'nao-lidas'; key: string; label: string }
  | { tipo: 'mensagem'; key: string; mensagem: Mensagem; mudouRemetente: boolean }

/**
 * Computed que transforma o array de mensagens em itens renderizáveis,
 * inserindo separadores de dia e o indicador de não lidas na posição correta.
 *
 * O indicador "nao-lidas" é inserido ANTES da mensagem cujo ID ===
 * primeiroIdNaoLidoSnapshot.
 *
 * O elemento recebe id="indicador-nao-lidas" no template para que o
 * useScrollManager possa localizar sua posição no DOM via getElementById
 * e verificar se auto-scroll o empurraria para fora da viewport.
 */
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
      itens.push({
        tipo: 'nao-lidas',
        key: 'nao-lidas',
        label: 'Últimas'
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

/** Janela perdeu o foco: a próxima mensagem recebida recebe o indicador. */
function aoDesfocarJanelaIndicador() {
  if (indicadorNaoLidasVisivel.value) reposicionarIndicador = true
}

window.addEventListener('blur', aoDesfocarJanelaIndicador)

onBeforeUnmount(() => {
  window.removeEventListener('blur', aoDesfocarJanelaIndicador)
})

/**
 * Wrapper de posicionarAberturaConversaAtiva que ativa o indicador ANTES
 * de posicionar o scroll.
 *
 * ORDEM CRÍTICA:
 * 1. Primeiro: verificar se há mensagens não lidas e ativar o indicador
 * 2. Segundo: chamar posicionarAberturaConversaAtiva()
 *
 * Essa ordem é necessária porque posicionarAberturaConversaAtiva() no
 * useScrollManager faz scroll até a primeira não lida com margem de 40px.
 * Se o indicador não estivesse no DOM antes do scroll, a margem seria
 * calculada sem considerar a altura do elemento indicador, resultando
 * em posicionamento errado.
 *
 * Este método é exposto via defineExpose como "posicionarAberturaConversaAtiva"
 * para que o componente pai chame esta versão (com indicador) em vez da
 * versão direta do useScrollManager.
 */
async function posicionarEIndicar() {
  // Ativar indicador ANTES do posicionamento para que o DOM já inclua o indicador
  const usuarioId = auth.user?.id
  const primeiraNaoLida = chat.mensagensAtivas.find(m => m.remetente_id !== usuarioId && !m.visualizada)
  const qtd = chat.conversaAtiva?.mensagens_sem_visualizar || 0
  if (primeiraNaoLida && qtd > 0) {
    primeiroIdNaoLidoSnapshot.value = primeiraNaoLida.id
    indicadorNaoLidasVisivel.value = true
  }
  await posicionarAberturaConversaAtiva()
}

defineExpose({
  posicionarAberturaConversaAtiva: posicionarEIndicar,
  rolarParaFinal,
  irParaMensagem,
  limparAnexos,
  ativarPaginacaoBidirecional,
  restaurarAncora
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
