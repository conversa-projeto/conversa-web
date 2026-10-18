<template>
  <div v-if="pastas.aberta" class="absolute inset-0 z-20 flex flex-col bg-surface-100">
    <div class="flex shrink-0 items-center gap-2 border-b border-surface-300 bg-surface-base px-3 py-1.5">
      <button
        type="button"
        class="flex items-center gap-1 rounded-full py-1 pl-1.5 pr-3 text-sm font-medium text-primary-600 hover:bg-surface-200 dark:text-primary-400"
        title="Voltar ao chat (Esc)"
        @click="pastas.fecharPasta()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Voltar ao chat
      </button>
      <span class="h-4 w-px bg-surface-300" />
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 shrink-0" :style="{ color: corDaPasta(pastas.aberta.cor) }">
        <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
      </svg>
      <span class="min-w-0 truncate text-sm font-semibold text-surface-800">{{ pastas.aberta.nome }}</span>
      <span class="shrink-0 text-xs text-surface-500">
        · {{ pastas.aberta.mensagens === 1 ? '1 mensagem' : `${pastas.aberta.mensagens} mensagens` }}{{ pastas.aberta.compartilhada ? ' · compartilhada' : '' }}
      </span>
    </div>

    <!-- Selecionadas aqui (arrastando ao lado ou Ctrl + clique): tirar todas de uma vez -->
    <div v-if="selecionadas.length" class="pointer-events-none absolute inset-x-0 top-12 z-30 flex justify-center px-3">
      <div class="pointer-events-auto flex items-center gap-1 rounded-full border border-surface-300 bg-surface-base py-1 pl-3 pr-1 text-xs text-surface-700 shadow-lg">
        <span class="font-semibold text-surface-800">{{ selecionadas.length === 1 ? '1 selecionada' : `${selecionadas.length} selecionadas` }}</span>
        <button
          type="button"
          class="ml-1 rounded-full px-2 py-1 font-medium text-danger-600 hover:bg-surface-200 dark:text-danger-400"
          @click="tirarSelecionadas"
        >
          Tirar da pasta
        </button>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded-full text-surface-500 hover:bg-surface-200"
          title="Limpar seleção (Esc)"
          @click="selecionadas = []"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div
      v-if="selecao.retangulo.value"
      class="pointer-events-none fixed z-40 rounded-sm border border-primary-500 bg-primary-500/10"
      :style="{ left: `${selecao.retangulo.value.left}px`, top: `${selecao.retangulo.value.top}px`, width: `${selecao.retangulo.value.width}px`, height: `${selecao.retangulo.value.height}px` }"
    />

    <div
      ref="lista"
      class="chat-pattern min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-4"
      @scroll="aoRolar"
      @pointerdown="selecao.aoPressionar"
      @click.capture="selecao.aoClicar"
    >
      <p v-if="pastas.carregandoAberta && !pastas.mensagensDaAberta.length" class="py-8 text-center text-sm text-surface-500">Carregando mensagens</p>
      <p v-else-if="!pastas.mensagensDaAberta.length" class="py-8 text-center text-sm text-surface-500">
        Nenhuma mensagem nesta pasta. No chat, arraste ao lado das mensagens para selecioná-las e solte-as aqui no painel.
      </p>

      <div class="mx-auto w-full max-w-[850px] pl-5">
        <template v-for="item in itens" :key="item.key">
          <div v-if="item.tipo === 'dia'" class="my-3 flex justify-center">
            <span class="rounded-full bg-surface-300 px-3 py-1 text-xs text-surface-700 dark:bg-surface-200 dark:text-surface-500">{{ item.label }}</span>
          </div>
          <div
            v-else
            class="rounded-lg transition-colors"
            :class="idsSelecionados.has(item.mensagem.id) ? 'bg-primary-500/25 ring-1 ring-primary-500/60' : ''"
            :data-selecao-id="item.mensagem.id"
            @contextmenu="(e) => idsSelecionados.has(item.mensagem.id) && repassarCliqueDireito(e, idsSelecionados)"
          >
          <MessageBubble
            :mensagem="item.mensagem"
            :is-own="item.mensagem.remetente_id === auth.user?.id"
            :is-group="false"
            :mudou-remetente="item.mudouRemetente"
            :get-anexo-url="anexoUrl"
            na-pasta
            @open-image="(id, nome) => emit('open-image', id, nome)"
            @download="baixarAnexo"
            @reply="responder"
            @forward="(msg) => emit('forward', msg)"
            @go-to-message="(id) => verNaConversa(id)"
            @reagir="reagir"
            @ver-na-conversa="(msg) => verNaConversa(msg.id)"
            @tirar-da-pasta="(msg) => tirar(msg.id)"
          />
          </div>
        </template>
      </div>
    </div>

    <DialogoConfirmacao :dialogo="dialogo.aberto.value" @responder="dialogo.responderDialogo" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { usePastasStore } from '../stores/pastas'
import { useAttachments } from '../composables/useAttachments'
import { useDialogo } from '../composables/useDialogo'
import { useSelecaoMensagens } from '../composables/useSelecaoMensagens'
import { formatarDiaSeparador } from '../utils/formatters'
import { corDaPasta, repassarCliqueDireito } from '../utils/pastas'
import * as api from '../services/conversaApi'
import MessageBubble from './MessageBubble.vue'
import DialogoConfirmacao from './DialogoConfirmacao.vue'
import type { Mensagem } from '../types/api'

// Chat só com as mensagens de uma pasta, por cima do chat normal (que fica
// como estava por baixo, com o campo de mensagem). Aqui não se envia nada:
// responder volta ao chat com a resposta no campo.

const emit = defineEmits<{
  'open-image': [identificador: string, nome: string]
  'forward': [mensagem: Mensagem]
  'ver-na-conversa': [mensagemId: number]
}>()

const auth = useAuthStore()
const chat = useChatStore()
const pastas = usePastasStore()
const dialogo = useDialogo()
const { anexoUrl, renovarAnexoUrl, abrirAnexo } = useAttachments()
provide('renovarAnexoUrl', renovarAnexoUrl)

const lista = ref<HTMLElement | null>(null)

// Seleção das mensagens da pasta, como no chat, para tirar várias de uma vez
const selecionadas = ref<number[]>([])
const idsSelecionados = computed(() => new Set(selecionadas.value))
const selecao = useSelecaoMensagens(lista, {
  ativa: () => !!pastas.aberta,
  selecionadas: () => selecionadas.value,
  definir: (ids) => { selecionadas.value = ids },
  alternar: (id) => {
    selecionadas.value = idsSelecionados.value.has(id) ? selecionadas.value.filter((s) => s !== id) : [...selecionadas.value, id]
  },
})
watch(() => pastas.abertaId, () => { selecionadas.value = [] })

async function tirarSelecionadas() {
  const pasta = pastas.aberta
  if (!pasta || !selecionadas.value.length) return
  try {
    await pastas.tirarMensagens(pasta.id, selecionadas.value)
    selecionadas.value = []
  } catch (e) {
    void dialogo.avisar({ titulo: 'Não foi possível tirar da pasta', mensagem: e instanceof Error ? e.message : 'Erro ao tirar da pasta' })
  }
}

type Item =
  | { tipo: 'dia'; key: string; label: string }
  | { tipo: 'mensagem'; key: string; mensagem: Mensagem; mudouRemetente: boolean }

const itens = computed<Item[]>(() => {
  const resultado: Item[] = []
  let diaAtual = ''
  let ultimoRemetente: number | null = null
  for (const mensagem of pastas.mensagensDaAberta) {
    const data = new Date(mensagem.inserida)
    const dia = `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`
    if (dia !== diaAtual) {
      diaAtual = dia
      ultimoRemetente = null
      resultado.push({ tipo: 'dia', key: `dia-${dia}`, label: formatarDiaSeparador(mensagem.inserida) })
    }
    resultado.push({ tipo: 'mensagem', key: `msg-${mensagem.id}`, mensagem, mudouRemetente: ultimoRemetente !== null && ultimoRemetente !== mensagem.remetente_id })
    ultimoRemetente = mensagem.remetente_id
  }
  return resultado
})

// Abriu (ou trocou de) pasta: começa nas mais recentes, embaixo
let rolarParaOFim = false
watch(() => pastas.abertaId, (id) => { rolarParaOFim = !!id }, { immediate: true })
watch(() => pastas.mensagensDaAberta, async (mensagens) => {
  if (!rolarParaOFim || !mensagens.length) return
  rolarParaOFim = false
  await nextTick()
  if (lista.value) lista.value.scrollTop = lista.value.scrollHeight
})

// Perto do topo, busca as anteriores sem a tela pular
async function aoRolar() {
  const el = lista.value
  if (!el || el.scrollTop > 80 || pastas.fimDaAberta || pastas.carregandoAberta) return
  const alturaAntes = el.scrollHeight
  const novas = await pastas.carregarAnteriores()
  if (novas) {
    await nextTick()
    el.scrollTop += el.scrollHeight - alturaAntes
  }
}

function verNaConversa(mensagemId: number) {
  pastas.fecharPasta()
  emit('ver-na-conversa', mensagemId)
}

function responder(mensagem: Mensagem) {
  pastas.fecharPasta()
  chat.responderMensagem(mensagem)
}

async function reagir(mensagemId: number, emoji: string) {
  try {
    await chat.reagirMensagem(mensagemId, emoji)
    // A cópia daqui não é a do chat: relê só esta mensagem
    const atualizada = (await api.getMensagens(pastas.aberta!.conversa_id, mensagemId, 0, 0))[0]
    if (atualizada) pastas.mensagensDaAberta = pastas.mensagensDaAberta.map((m) => (m.id === mensagemId ? { ...atualizada, pastas: m.pastas } : m))
  } catch (e) {
    void dialogo.avisar({ titulo: 'Não foi possível reagir', mensagem: e instanceof Error ? e.message : 'Erro ao reagir' })
  }
}

async function tirar(mensagemId: number) {
  const pasta = pastas.aberta
  if (!pasta) return
  try {
    await pastas.tirarMensagens(pasta.id, [mensagemId])
  } catch (e) {
    void dialogo.avisar({ titulo: 'Não foi possível tirar da pasta', mensagem: e instanceof Error ? e.message : 'Erro ao tirar da pasta' })
  }
}

function baixarAnexo(identificador: string, nome: string) {
  abrirAnexo(identificador, nome).catch((e) => {
    void dialogo.avisar({ titulo: 'Não foi possível baixar', mensagem: e instanceof Error ? e.message : 'Erro ao baixar o anexo' })
  })
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key !== 'Escape' || !pastas.aberta || dialogo.aberto.value) return
  // Com seleção, o Esc primeiro limpa a seleção; depois volta ao chat
  if (selecionadas.value.length) selecionadas.value = []
  else pastas.fecharPasta()
}
window.addEventListener('keydown', aoTeclar)
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))
</script>
