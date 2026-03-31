<template>
  <div class="flex h-full flex-col bg-surface-200">
    <div class="flex items-end px-3 pb-3" style="height: 64px">
      <div class="relative flex min-w-0 flex-1 items-center rounded-full border border-surface-300 bg-surface-50 pr-1 focus-within:border-primary-500">
        <input
          ref="inputRef"
          v-model="termo"
          type="text"
          class="min-w-0 flex-1 bg-transparent pl-4 pr-1 py-1.5 text-sm text-surface-800 outline-none"
          placeholder="Pesquisar em todos os chats..."
          @keyup.enter="pesquisar"
        />
        <button
          type="button"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:text-surface-700"
          title="Cancelar"
          @click="cancelar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="chat.buscandoGlobal" class="flex items-center justify-center py-8 text-surface-500">
        <svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
        <span class="ml-2 text-sm">Pesquisando...</span>
      </div>

      <div v-else-if="pesquisou && !resultadosAgrupados.length" class="px-4 py-8 text-center text-sm text-surface-500">
        Nenhum resultado encontrado.
      </div>

      <template v-else>
        <div v-for="grupo in resultadosAgrupados" :key="grupo.conversaId" class="border-b border-surface-300">
          <div class="flex items-center gap-2 px-3 py-1.5 bg-surface-100">
            <span class="text-xs font-semibold text-surface-600 truncate">{{ grupo.titulo }}</span>
            <span class="rounded-full bg-surface-300 px-1.5 py-0.5 text-[10px] font-medium text-surface-600">{{ grupo.mensagens.length }}</span>
          </div>
          <button
            v-for="msg in grupo.mensagens"
            :key="msg.id"
            class="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-surface-300 transition"
            @click="abrirMensagem(grupo.conversaId, msg.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-xs font-medium text-surface-700">{{ msg.remetente }}</span>
              <span class="shrink-0 text-[11px] text-surface-600">{{ formatarDataHoraCurta(msg.inserida) }}</span>
            </div>
            <p class="truncate text-xs text-surface-500" v-html="destacarTermo(resumoMensagem(msg))"></p>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useChatStore } from '../stores/chat'
import { resumoMensagem } from '../utils/formatters'

function formatarDataHoraCurta(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = String(d.getFullYear()).slice(2)
  const hora = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} ${hora}:${min}`
}
import type { Mensagem } from '../types/api'

const emit = defineEmits<{
  close: []
  'open-message': [conversaId: number, mensagemId: number]
}>()

const chat = useChatStore()
const termo = ref('')
const pesquisou = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const resultadosAgrupados = computed(() => {
  const mapa = new Map<number, { conversaId: number; titulo: string; mensagens: Mensagem[] }>()

  for (const msg of chat.resultadosBuscaGlobal) {
    if (!mapa.has(msg.conversa_id)) {
      const conversa = chat.conversas.find(c => c.id === msg.conversa_id)
      mapa.set(msg.conversa_id, {
        conversaId: msg.conversa_id,
        titulo: conversa?.descricao || conversa?.nome || `Conversa #${msg.conversa_id}`,
        mensagens: []
      })
    }
    mapa.get(msg.conversa_id)!.mensagens.push(msg)
  }

  return Array.from(mapa.values())
})

function destacarTermo(texto: string): string {
  const t = termo.value.trim()
  if (!t) return texto
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return texto.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-warning-200 dark:bg-warning-800 rounded px-0.5">$1</mark>')
}

async function pesquisar() {
  const t = termo.value.trim()
  if (!t) return
  pesquisou.value = true
  await chat.buscarEmTodosChats(t)
}

function cancelar() {
  termo.value = ''
  pesquisou.value = false
  chat.resultadosBuscaGlobal = []
  emit('close')
}

function abrirMensagem(conversaId: number, mensagemId: number) {
  emit('open-message', conversaId, mensagemId)
}

onMounted(() => {
  termo.value = ''
  pesquisou.value = false
  chat.resultadosBuscaGlobal = []
  nextTick(() => inputRef.value?.focus())
})
</script>
