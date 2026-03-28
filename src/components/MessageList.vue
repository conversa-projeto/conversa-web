<template>
  <div v-if="chat.conversaAtiva" class="chat-pattern relative flex flex-col flex-1 min-h-0 bg-surface-100">
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

      <div class="mx-auto w-full max-w-[850px]">

        <template v-for="item in itensMensagens" :key="item.key">
          <div v-if="item.tipo === 'dia'" class="my-3 flex justify-center">
            <span class="rounded-full bg-surface-300 px-3 py-1 text-xs text-surface-700 dark:bg-surface-200 dark:text-surface-500">
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
      <div class="mx-auto w-full max-w-[850px]">
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
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
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
  carregandoSeguintes,
  haNovasMensagens,
  indicadorNaoLidasAtivo,
  ativarPaginacaoBidirecional
} = useScrollManager()

const { anexoUrl, renovarAnexoUrl, abrirAnexo, limparAnexos } = useAttachments()

provide('renovarAnexoUrl', renovarAnexoUrl)

// =====================================================================
// INDICADOR DE MENSAGENS NÃO LIDAS
//
// O indicador é a barra "X mensagens não lidas" que aparece DENTRO do
// chat, posicionada entre as mensagens, logo acima da primeira não lida.
//
// === REGRAS FUNDAMENTAIS (NÃO QUEBRAR) ===
//
// 1. POSIÇÃO FIXA NA PRIMEIRA APARIÇÃO:
//    O primeiroIdNaoLidoSnapshot é definido UMA ÚNICA VEZ quando o
//    indicador aparece pela primeira vez. Novas mensagens que chegam
//    NÃO movem a posição do indicador — ele permanece fixo acima da
//    mensagem onde apareceu originalmente. Apenas o contador (qtd) é
//    atualizado para refletir o número total de não lidas.
//
// 2. PERSISTÊNCIA ATÉ VISUALIZAÇÃO COMPLETA:
//    O indicador NÃO desaparece por timeout enquanto houver mensagens
//    sem visualizar (chat.conversaAtiva.mensagens_sem_visualizar > 0).
//    O timer de 3s apenas verifica se ainda há pendentes. Se houver,
//    reagenda. Se não houver mais, aí sim esconde o indicador.
//
// 3. AUTO-SCROLL NÃO DEVE ESCONDER O INDICADOR:
//    Quando uma nova mensagem chega e o scroll deveria ir para o final,
//    o useScrollManager verifica se isso empurraria o indicador para
//    fora da viewport. Se sim, o scroll NÃO acontece. Essa verificação
//    está no watch de mensagens e no watch de carregamento do
//    useScrollManager.ts, usando o ref indicadorNaoLidasAtivo que é
//    sincronizado com indicadorNaoLidasVisivel via watch.
//
// 4. ABERTURA DE CONVERSA COM NÃO LIDAS:
//    Ao abrir um chat que já tem mensagens não lidas, o indicador é
//    ativado ANTES do posicionamento (em posicionarEIndicar), para que
//    o DOM já contenha o elemento e o scroll possa posicionar na
//    primeira não lida corretamente.
//
// 5. TROCA DE CONVERSA LIMPA TUDO:
//    Ao trocar de conversa (watch conversaAtivaId), todos os estados
//    do indicador são resetados (visibilidade, contagem, posição, timer).
//
// === FLUXO DO INDICADOR ===
//
// Cenário A — Nova mensagem em tempo real (navegador sem foco ou longe do final):
//   1. Watch detecta novo ultimoId do outro remetente
//   2. Se navegador focado e perto do final (≤500px) → ignora (usuário já vê)
//   3. Se indicador ainda não visível → trava primeiroIdNaoLidoSnapshot no ID
//   4. Atualiza qtdNaoLidasSnapshot com o contador do servidor
//   5. Ativa indicadorNaoLidasVisivel = true
//   6. Agenda timer de 3s que verifica se ainda há não lidas
//
// Cenário B — Abertura de chat com não lidas:
//   1. posicionarEIndicar() encontra a primeira mensagem não lida
//   2. Ativa o indicador com posição e contagem
//   3. Chama posicionarAberturaConversaAtiva() que posiciona o scroll
//
// Cenário C — Timer expira:
//   1. Verifica mensagens_sem_visualizar no store
//   2. Se > 0 → reagenda timer (indicador continua visível)
//   3. Se = 0 → esconde indicador (todas foram visualizadas)
//
// Cenário D — Janela recebe foco:
//   1. Se indicador está visível e timer não está rodando
//   2. Verifica se ainda há não lidas
//   3. Se sim → reagenda timer. Se não → esconde indicador
//
// === COMUNICAÇÃO COM useScrollManager ===
//
// O ref indicadorNaoLidasAtivo (do useScrollManager) é mantido em
// sincronia com indicadorNaoLidasVisivel (local) via watch. Isso
// permite que o useScrollManager verifique, antes de fazer auto-scroll,
// se o elemento DOM #indicador-nao-lidas seria empurrado para fora da
// viewport. Se seria, o auto-scroll é cancelado.
//
// === RENDERIZAÇÃO NO TEMPLATE ===
//
// O computed itensMensagens insere o item { tipo: 'nao-lidas' } no
// array de renderização ANTES da mensagem cujo ID === primeiroIdNaoLidoSnapshot.
// O contador exibido é lido de chat.conversaAtiva.mensagens_sem_visualizar
// (valor mais atualizado do servidor) com fallback para qtdNaoLidasSnapshot.
// =====================================================================

/** Controla se o indicador "X mensagens não lidas" está visível no chat */
const indicadorNaoLidasVisivel = ref(false)

/** Contagem de mensagens não lidas no momento da primeira ativação */
const qtdNaoLidasSnapshot = ref(0)

/**
 * ID da mensagem onde o indicador está posicionado.
 * Definido UMA VEZ quando o indicador aparece pela primeira vez.
 * Novas mensagens NÃO alteram esta posição — apenas o contador atualiza.
 */
const primeiroIdNaoLidoSnapshot = ref<number | null>(null)

/** Timer que verifica periodicamente se ainda há mensagens sem visualizar */
let timerIndicador: ReturnType<typeof setTimeout> | null = null

/**
 * Reseta todos os estados do indicador.
 * Chamado ao trocar de conversa para evitar vazamento entre chats.
 */
function limparIndicador() {
  indicadorNaoLidasVisivel.value = false
  qtdNaoLidasSnapshot.value = 0
  primeiroIdNaoLidoSnapshot.value = null
  if (timerIndicador) { clearTimeout(timerIndicador); timerIndicador = null }
}

/**
 * Agenda verificação periódica (3s) para decidir se o indicador deve persistir.
 *
 * REGRA CRÍTICA: O indicador só desaparece quando mensagens_sem_visualizar === 0.
 * Se ainda houver mensagens sem visualizar, o timer é reagendado indefinidamente.
 * Isso garante que o indicador persista até o usuário scrollar e visualizar todas.
 */
function agendarTimerIndicador() {
  if (timerIndicador) clearTimeout(timerIndicador)
  timerIndicador = setTimeout(() => {
    timerIndicador = null
    const semVisualizar = chat.conversaAtiva?.mensagens_sem_visualizar || 0
    if (semVisualizar > 0) {
      // Ainda há não lidas — manter indicador e verificar novamente em 3s
      agendarTimerIndicador()
    } else {
      // Todas visualizadas — esconder indicador
      indicadorNaoLidasVisivel.value = false
    }
  }, 3000)
}

/** Ao trocar de conversa, limpar todo o estado do indicador */
watch(() => chat.conversaAtivaId, () => limparIndicador())

/**
 * Manter o ref do useScrollManager sincronizado com o estado local.
 * O useScrollManager usa indicadorNaoLidasAtivo para decidir se deve
 * cancelar auto-scroll que empurraria o indicador para fora da viewport.
 */
watch(indicadorNaoLidasVisivel, (v) => { indicadorNaoLidasAtivo.value = v })

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

    // Atualizar contagem com o valor mais recente do servidor
    const qtd = chat.conversaAtiva?.mensagens_sem_visualizar || 1
    qtdNaoLidasSnapshot.value = qtd

    // POSIÇÃO FIXA: só definir na primeira vez que o indicador aparece.
    // Novas mensagens não movem o indicador — ele fica travado acima
    // da mensagem onde apareceu originalmente.
    if (!indicadorNaoLidasVisivel.value) {
      primeiroIdNaoLidoSnapshot.value = ultima.id
    }

    indicadorNaoLidasVisivel.value = true
    if (timerIndicador) clearTimeout(timerIndicador)
    agendarTimerIndicador()
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
 * primeiroIdNaoLidoSnapshot. O contador é lido de mensagens_sem_visualizar
 * (servidor, mais preciso) com fallback para qtdNaoLidasSnapshot (local).
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

/**
 * Handler executado quando a janela do navegador recebe foco.
 *
 * Quando o navegador perde foco, o timer não é cancelado mas pode ter
 * expirado enquanto a janela estava em background. Ao receber foco novamente:
 * - Se o indicador está visível e o timer não está rodando (expirou em background),
 *   verifica se ainda há não lidas e reagenda ou esconde conforme necessário.
 * - Isso evita que o indicador fique "preso" visível se as mensagens foram
 *   visualizadas por outro dispositivo enquanto a janela estava em background.
 */
function aoFocarJanelaIndicador() {
  if (indicadorNaoLidasVisivel.value && !timerIndicador) {
    const semVisualizar = chat.conversaAtiva?.mensagens_sem_visualizar || 0
    if (semVisualizar > 0) {
      agendarTimerIndicador()
    } else {
      indicadorNaoLidasVisivel.value = false
    }
  }
}

window.addEventListener('focus', aoFocarJanelaIndicador)

onBeforeUnmount(() => {
  window.removeEventListener('focus', aoFocarJanelaIndicador)
  if (timerIndicador) { clearTimeout(timerIndicador); timerIndicador = null }
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
  limparAnexos,
  ativarPaginacaoBidirecional
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
