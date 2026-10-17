<template>
  <aside class="flex h-full w-52 flex-col overflow-hidden border-l border-surface-300 bg-surface-base">
    <div class="flex shrink-0 items-center gap-1 border-b border-surface-300 py-2 pl-3 pr-1">
      <h3 class="min-w-0 flex-1 truncate text-sm font-semibold text-surface-800">Pastas</h3>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
        title="Nova pasta"
        @click="iniciarCriacao"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
      </button>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
        title="Fechar"
        @click="emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-1.5">
      <form v-if="criando" class="mb-1 px-1" @submit.prevent="confirmarCriacao">
        <input
          ref="campoNovo"
          v-model="nomeNovo"
          type="text"
          maxlength="60"
          placeholder="Nome da pasta"
          class="w-full rounded border border-surface-300 bg-surface-100 px-2 py-1 text-sm text-surface-800 outline-none focus:border-primary-500"
          @keydown.esc.prevent="criando = false"
          @blur="aoSairDoCampoNovo"
        />
      </form>

      <p v-if="!pastas.lista.length && !criando" class="px-2 py-3 text-xs leading-relaxed text-surface-500">
        Crie pastas para guardar mensagens por assunto. Arraste ao lado das mensagens para selecioná-las e solte-as numa pasta.
      </p>

      <p v-if="pastas.arrastando && pastas.lista.length" class="px-2 pb-1 text-[11px] font-medium text-primary-600 dark:text-primary-400">
        Solte numa pasta
      </p>

      <div
        v-for="pasta in pastas.lista"
        :key="pasta.id"
        class="group relative mb-0.5 rounded-md border transition-colors"
        :class="[
          sobre === pasta.id ? 'border-primary-500 bg-primary-500/15' : pastas.arrastando ? 'border-dashed border-surface-400' : 'border-transparent',
          pastas.abertaId === pasta.id ? 'bg-surface-200' : '',
        ]"
        @dragenter.prevent="aoEntrarArraste($event, pasta.id)"
        @dragover="aoPassarArraste($event, pasta.id)"
        @dragleave="aoSairArraste($event, pasta.id)"
        @drop.prevent="aoSoltar($event, pasta.id)"
      >
        <form v-if="renomeando === pasta.id" class="px-1 py-1" @submit.prevent="confirmarRenomear(pasta)">
          <input
            ref="campoRenomear"
            v-model="nomeEditado"
            type="text"
            maxlength="60"
            class="w-full rounded border border-surface-300 bg-surface-100 px-2 py-0.5 text-sm text-surface-800 outline-none focus:border-primary-500"
            @keydown.esc.prevent="renomeando = null"
            @blur="confirmarRenomear(pasta)"
          />
        </form>
        <button
          v-else
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-200"
          :title="pasta.dono_id === auth.user?.id ? pasta.nome : `${pasta.nome} (compartilhada por ${nomeOutraPessoa})`"
          @click="pastas.abrirPasta(pasta.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 shrink-0" :style="{ color: corDaPasta(pasta.cor) }">
            <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
          </svg>
          <span class="min-w-0 flex-1 truncate text-sm text-surface-800">{{ pasta.nome }}</span>
          <svg
            v-if="pasta.compartilhada"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.8"
            stroke="currentColor"
            class="h-3.5 w-3.5 shrink-0 text-surface-500"
          >
            <title>{{ pasta.dono_id === auth.user?.id ? `Compartilhada com ${nomeOutraPessoa}` : `Compartilhada por ${nomeOutraPessoa}` }}</title>
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          <span class="shrink-0 text-xs text-surface-500" :class="pasta.dono_id === auth.user?.id ? 'group-hover:hidden' : ''">{{ pasta.mensagens }}</span>
          <span v-if="pasta.dono_id === auth.user?.id" class="hidden h-4 w-4 shrink-0 group-hover:block" />
        </button>

        <button
          v-if="pasta.dono_id === auth.user?.id && renomeando !== pasta.id"
          type="button"
          class="absolute right-1 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-surface-600 hover:bg-surface-300 group-hover:flex"
          :class="menuAberto === pasta.id ? '!flex' : ''"
          title="Opções da pasta"
          @click.stop="menuAberto = menuAberto === pasta.id ? null : pasta.id"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4"><path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" /></svg>
        </button>

        <div
          v-if="menuAberto === pasta.id"
          class="absolute right-1 top-full z-20 mt-0.5 w-48 rounded-md border border-surface-300 bg-surface-base py-1 text-sm shadow-lg"
          @click.stop
        >
          <button type="button" class="block w-full px-3 py-1.5 text-left text-surface-800 hover:bg-surface-200" @click="iniciarRenomear(pasta)">Renomear</button>
          <button type="button" class="block w-full px-3 py-1.5 text-left text-surface-800 hover:bg-surface-200" @click="alternarCompartilhada(pasta)">
            {{ pasta.compartilhada ? 'Deixar de compartilhar' : `Compartilhar com ${nomeOutraPessoa}` }}
          </button>
          <div class="flex flex-wrap gap-1.5 px-3 py-1.5">
            <button
              v-for="cor in CORES_PASTA"
              :key="cor || 'tema'"
              type="button"
              class="h-4 w-4 rounded-full ring-offset-1 ring-offset-surface-base"
              :class="pasta.cor === cor ? 'ring-2 ring-surface-600' : ''"
              :style="{ background: corDaPasta(cor) }"
              :title="cor ? 'Cor' : 'Cor do tema'"
              @click="mudarCor(pasta, cor)"
            />
          </div>
          <button type="button" class="block w-full px-3 py-1.5 text-left text-danger-600 hover:bg-surface-200" @click="excluir(pasta)">Excluir</button>
        </div>
      </div>
    </div>

    <DialogoConfirmacao :dialogo="dialogo.aberto.value" @responder="dialogo.responderDialogo" />
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { usePastasStore } from '../stores/pastas'
import { useDialogo } from '../composables/useDialogo'
import { CORES_PASTA, corDaPasta, ehArrasteDeMensagens, mensagensDoArraste } from '../utils/pastas'
import DialogoConfirmacao from './DialogoConfirmacao.vue'
import type { PastaMensagens } from '../types/api'

const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const chat = useChatStore()
const pastas = usePastasStore()
const dialogo = useDialogo()

const nomeOutraPessoa = computed(() => chat.conversaAtiva?.descricao || 'a outra pessoa')

function avisarErro(titulo: string, e: unknown) {
  void dialogo.avisar({ titulo, mensagem: e instanceof Error ? e.message : String(e) })
}

// --- Criar ---

const criando = ref(false)
const nomeNovo = ref('')
const campoNovo = ref<HTMLInputElement | null>(null)

async function iniciarCriacao() {
  criando.value = true
  nomeNovo.value = ''
  await nextTick()
  campoNovo.value?.focus()
}

async function confirmarCriacao() {
  const nome = nomeNovo.value.trim()
  criando.value = false
  if (!nome) return
  try {
    await pastas.criar(nome, '', false)
  } catch (e) {
    avisarErro('Não foi possível criar a pasta', e)
  }
}

function aoSairDoCampoNovo() {
  if (criando.value) void confirmarCriacao()
}

// --- Opções (só de quem criou) ---

const menuAberto = ref<number | null>(null)
const renomeando = ref<number | null>(null)
const nomeEditado = ref('')
const campoRenomear = ref<HTMLInputElement[]>([])

function fecharMenu() {
  menuAberto.value = null
}
window.addEventListener('click', fecharMenu)
onBeforeUnmount(() => window.removeEventListener('click', fecharMenu))

async function iniciarRenomear(pasta: PastaMensagens) {
  menuAberto.value = null
  renomeando.value = pasta.id
  nomeEditado.value = pasta.nome
  await nextTick()
  campoRenomear.value[0]?.select()
}

async function confirmarRenomear(pasta: PastaMensagens) {
  if (renomeando.value !== pasta.id) return
  renomeando.value = null
  const nome = nomeEditado.value.trim()
  if (!nome || nome === pasta.nome) return
  try {
    await pastas.alterar(pasta.id, { nome })
  } catch (e) {
    avisarErro('Não foi possível renomear a pasta', e)
  }
}

async function alternarCompartilhada(pasta: PastaMensagens) {
  menuAberto.value = null
  try {
    await pastas.alterar(pasta.id, { compartilhada: !pasta.compartilhada })
  } catch (e) {
    avisarErro('Não foi possível mudar a pasta', e)
  }
}

async function mudarCor(pasta: PastaMensagens, cor: string) {
  menuAberto.value = null
  try {
    await pastas.alterar(pasta.id, { cor })
  } catch (e) {
    avisarErro('Não foi possível mudar a cor', e)
  }
}

async function excluir(pasta: PastaMensagens) {
  menuAberto.value = null
  const confirmado = await dialogo.confirmar({
    titulo: 'Excluir pasta',
    mensagem: `A pasta "${pasta.nome}" sai daqui${pasta.compartilhada ? ` e de ${nomeOutraPessoa.value}` : ''}. As mensagens continuam na conversa.`,
    textoConfirmar: 'Excluir',
    perigo: true,
  })
  if (!confirmado) return
  try {
    await pastas.excluir(pasta.id)
  } catch (e) {
    avisarErro('Não foi possível excluir a pasta', e)
  }
}

// --- Soltar as mensagens arrastadas do chat ---

const sobre = ref<number | null>(null)

function aoEntrarArraste(evento: DragEvent, pastaId: number) {
  if (ehArrasteDeMensagens(evento)) sobre.value = pastaId
}

function aoPassarArraste(evento: DragEvent, pastaId: number) {
  if (!ehArrasteDeMensagens(evento)) return
  evento.preventDefault()
  if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
  sobre.value = pastaId
}

function aoSairArraste(evento: DragEvent, pastaId: number) {
  const destino = evento.relatedTarget as Node | null
  if (sobre.value === pastaId && !(evento.currentTarget as HTMLElement).contains(destino)) sobre.value = null
}

async function aoSoltar(evento: DragEvent, pastaId: number) {
  sobre.value = null
  pastas.arrastando = false
  const ids = mensagensDoArraste(evento)
  if (!ids.length) return
  try {
    await pastas.porMensagens(pastaId, ids)
    pastas.limparSelecao()
  } catch (e) {
    avisarErro('Não foi possível pôr na pasta', e)
  }
}
</script>
