<template>
  <div class="flex h-full flex-col border-l border-chamada-700 bg-chamada-800">
    <div class="flex shrink-0 items-center gap-2 border-b border-chamada-700 px-3 py-2">
      <span class="text-xs font-medium">Chat da chamada</span>
      <button
        type="button"
        class="ml-auto flex h-6 w-6 items-center justify-center rounded text-chamada-300 hover:bg-chamada-700 hover:text-white"
        title="Fechar chat"
        @click="emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>

    <!-- Completo: o mesmo chat da tela principal, com anexos, respostas, reações... -->
    <div v-if="modoCompleto" class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-100 text-surface-800">
      <MessageList
        v-if="chat.conversaAtivaId === call.conversaChatId"
        ref="listaCompleta"
        :altura-campo-mensagem="alturaInput"
        @open-image="(id: string, nome: string) => emit('open-image', id, nome)"
        @forward="(mensagem: Mensagem) => emit('forward', mensagem)"
        @open-message="(conversaId: number, mensagemId: number) => emit('open-message', conversaId, mensagemId)"
      />
      <!-- Grupo ainda não existe: o campo é criado ao clicar nele -->
      <template v-if="!call.conversaChatId">
        <p class="flex-1 px-6 py-6 text-center text-xs text-surface-500">
          As mensagens enviadas aqui ficam num grupo com quem está na chamada.
        </p>
        <p v-if="erro" class="mx-3 mb-1 rounded bg-danger-500/90 px-2 py-1 text-[11px] text-white">{{ erro }}</p>
        <div class="px-3 pb-2">
          <button
            type="button"
            class="flex h-[46px] w-full items-center rounded-3xl border border-surface-500 bg-surface-base px-4 text-left text-sm text-surface-500 transition-colors hover:border-primary-500 disabled:cursor-wait"
            :disabled="enviando"
            @click="iniciarChat"
          >{{ enviando ? 'Abrindo o chat...' : 'Digite uma mensagem' }}</button>
        </div>
      </template>
      <MessageInput
        v-if="call.conversaChatId && chat.conversaAtivaId === call.conversaChatId"
        ref="campoCompleto"
        class="absolute inset-x-0 bottom-0 z-10"
        @message-sent="listaCompleta?.rolarParaFinal()"
        @altura-mudou="(altura: number) => alturaInput = altura"
        @open-image-preview="(blob: Blob, nome: string, mime: string) => emit('open-image-preview', blob, nome, mime)"
        @open-fila-image="(url: string, nome: string, identificador: string, galeria: ItemFila[]) => emit('open-fila-image', url, nome, identificador, galeria)"
      />
    </div>

    <template v-else>
    <div ref="lista" class="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
      <p v-if="mensagens.length === 0" class="py-6 text-center text-xs text-chamada-300">
        As mensagens enviadas aqui ficam num grupo com quem está na chamada.
      </p>
      <div
        v-for="mensagem in mensagens"
        :key="mensagem.id"
        class="flex flex-col"
        :class="mensagem.remetente_id === meuId ? 'items-end' : 'items-start'"
      >
        <span v-if="mensagem.remetente_id !== meuId" class="mb-0.5 text-[10px] text-chamada-300">{{ mensagem.remetente }}</span>
        <div
          class="max-w-[90%] whitespace-pre-wrap break-words rounded-lg px-2.5 py-1.5 text-xs"
          :class="mensagem.remetente_id === meuId ? 'bg-primary-600 text-white' : 'bg-chamada-700 text-white'"
        >{{ textoDa(mensagem) }}</div>
        <span class="mt-0.5 text-[9px] text-chamada-300">{{ formatarHora(mensagem.inserida) }}</span>
      </div>
    </div>

    <p v-if="erro" class="mx-3 mb-1 rounded bg-danger-500/90 px-2 py-1 text-[11px] text-white">{{ erro }}</p>

    <form class="flex shrink-0 items-end gap-2 border-t border-chamada-700 p-2" @submit.prevent="enviar">
      <textarea
        ref="campo"
        v-model="texto"
        rows="1"
        placeholder="Mensagem"
        class="max-h-24 min-h-[2rem] flex-1 resize-none rounded-lg bg-chamada-700 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-chamada-300 focus:ring-1 focus:ring-primary-500"
        @keydown.enter.exact.prevent="enviar"
      ></textarea>
      <button
        type="submit"
        :disabled="!texto.trim() || enviando"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
        title="Enviar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
      </button>
    </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useCallStore } from '../stores/call'
import { useChatStore } from '../stores/chat'
import * as api from '../services/conversaApi'
import { TipoConteudo, type Mensagem } from '../types/api'
import { formatarHora } from '../utils/formatters'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'

type ItemFila = { identificador: string; nome: string; url: string }

// completo: na janela principal, usa o chat de verdade. Na janela popup da
// chamada fica o painel simples (o visualizador de imagens e os modais vivem
// na janela principal)
const props = withDefaults(defineProps<{ completo?: boolean }>(), { completo: false })

const emit = defineEmits<{
  close: []
  'open-image': [identificador: string, nome: string]
  forward: [mensagem: Mensagem]
  'open-message': [conversaId: number, mensagemId: number]
  'open-image-preview': [blob: Blob, nome: string, mime: string]
  'open-fila-image': [url: string, nome: string, identificador: string, galeria: ItemFila[]]
}>()

const auth = useAuthStore()
const call = useCallStore()
const chat = useChatStore()

const lista = ref<HTMLElement | null>(null)
const campo = ref<HTMLTextAreaElement | null>(null)
const mensagens = ref<Mensagem[]>([])
const texto = ref('')
const enviando = ref(false)
const erro = ref('')
const meuId = computed(() => auth.user?.id)
// Já pedidas como visualizadas: dois carregamentos seguidos não repetem o pedido
const marcadas = new Set<number>()

// --- Modo completo ---
// O grupo é criado no primeiro clique no campo. Aberto, o chat da chamada vira
// a conversa ativa; ao fechar, volta a anterior.
const listaCompleta = ref<InstanceType<typeof MessageList> | null>(null)
const alturaInput = ref(0)
const campoCompleto = ref<InstanceType<typeof MessageInput> | null>(null)
const modoCompleto = computed(() => props.completo)
let conversaAnterior: number | null = null
let assumiu = false

async function abrirCompleto() {
  const id = call.conversaChatId
  if (!id) return
  if (!assumiu) {
    conversaAnterior = chat.conversaAtivaId === id ? null : chat.conversaAtivaId
    assumiu = true
  }
  await chat.selecionarConversa(id)
  await nextTick()
  await listaCompleta.value?.posicionarAberturaConversaAtiva()
}

watch(() => props.completo && call.conversaChatId, (id) => { if (id) void abrirCompleto() }, { immediate: true })

// Primeiro clique no campo, sem grupo ainda: cria o grupo da chamada e abre o
// chat completo nele, já com o cursor no campo
async function iniciarChat() {
  if (enviando.value) return
  enviando.value = true
  erro.value = ''
  try {
    const id = await call.garantirChatChamada()
    if (!chat.conversas.some((c) => c.id === id)) await chat.carregarConversas()
    await abrirCompleto()
    await nextTick()
    campoCompleto.value?.focarInput()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao abrir o chat'
  } finally {
    enviando.value = false
  }
}

onBeforeUnmount(() => {
  if (!assumiu || chat.conversaAtivaId !== call.conversaChatId) return
  if (conversaAnterior) void chat.selecionarConversa(conversaAnterior)
  else chat.conversaAtivaId = null
})

// Muda a cada mensagem nova no grupo: a lista de conversas é recarregada
// quando chega mensagem
const ultimaDoGrupo = computed(() => {
  const id = call.conversaChatId
  return id ? chat.conversas.find((c) => c.id === id)?.mensagem_id : undefined
})

const NOMES_ANEXO: Partial<Record<TipoConteudo, string>> = {
  [TipoConteudo.Imagem]: '[Imagem]',
  [TipoConteudo.Audio]: '[Áudio]',
  [TipoConteudo.GravacaoAudio]: '[Áudio]',
  [TipoConteudo.Figurinha]: '[Figurinha]',
  [TipoConteudo.Enquete]: '[Votação]',
}

// O painel é só texto: anexos e outros conteúdos aparecem pelo nome, e a
// conversa completa fica no grupo, na lista de conversas
function textoDa(mensagem: Mensagem) {
  return mensagem.conteudos
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((c) => (c.tipo === TipoConteudo.Texto ? c.conteudo : NOMES_ANEXO[c.tipo] ?? '[Arquivo]'))
    .join('\n')
}

async function rolarParaFinal() {
  await nextTick()
  if (lista.value) lista.value.scrollTop = lista.value.scrollHeight
}

async function carregar() {
  const id = call.conversaChatId
  if (!id || modoCompleto.value) return
  try {
    mensagens.value = (await api.getMensagens(id, 0, 80, 0)).filter((m) => !m.excluida_em)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao carregar o chat'
    return
  }
  void rolarParaFinal()
  // Aberto, quem está no painel já viu o que chegou
  chat.definirMensagens(id, mensagens.value)
  const naoVistas = mensagens.value
    .filter((m) => m.remetente_id !== meuId.value && !m.visualizada && !marcadas.has(m.id))
    .map((m) => m.id)
  naoVistas.forEach((mensagemId) => marcadas.add(mensagemId))
  if (naoVistas.length) void chat.marcarMensagensComoVisualizadas(id, naoVistas)
}

async function enviar() {
  const conteudo = texto.value.trim()
  if (!conteudo || enviando.value) return
  enviando.value = true
  erro.value = ''
  try {
    const id = await call.garantirChatChamada()
    await api.enviarMensagem(id, [{ ordem: 1, tipo: TipoConteudo.Texto, conteudo }])
    texto.value = ''
    // No completo, a primeira mensagem aparece no chat que acabou de abrir
    if (modoCompleto.value) await chat.recarregarMensagensRecentes(id)
    else await carregar()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao enviar a mensagem'
  } finally {
    enviando.value = false
    campo.value?.focus()
  }
}

watch([() => call.conversaChatId, ultimaDoGrupo], () => { void carregar() })

onMounted(() => {
  campo.value?.focus()
  void carregar()
})
</script>
