<template>
  <div class="border-b border-slate-200 p-4">
    <div class="mx-auto w-full max-w-[1200px]">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 md:hidden"
            @click="emit('update:sidebar-aberta', true)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          </button>
          <h2 class="text-lg font-semibold text-slate-800">
            {{ chat.conversaAtiva?.descricao || chat.conversaAtiva?.nome || `Conversa #${chat.conversaAtiva?.id}` }}
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-sm text-emerald-700 hover:bg-emerald-200"
            title="Chamada de voz"
            @click="emit('start-call', 1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
            <span class="hidden md:inline">Ligar</span>
          </button>
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1.5 text-sm text-blue-700 hover:bg-blue-200"
            title="Chamada de v&iacute;deo"
            @click="emit('start-call', 2)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            <span class="hidden md:inline">V&iacute;deo</span>
          </button>
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1.5 text-sm text-purple-700 hover:bg-purple-200"
            title="Compartilhar tela"
            @click="emit('start-call', 2, true)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
            <span class="hidden md:inline">Tela</span>
          </button>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200"
            title="Pesquisar na conversa"
            @click="painelBuscaChat = !painelBuscaChat; if (!painelBuscaChat) { buscaNoChat = ''; chat.resultadosBuscaConversa = [] }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-slate-600"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          </button>
        </div>
      </div>

      <div v-if="painelBuscaChat" class="mt-2">
        <div class="flex gap-2">
          <input
            v-model="buscaNoChat"
            type="text"
            class="w-full rounded border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            placeholder="Pesquisar nesta conversa"
            @keyup.enter="pesquisarNoChat"
            autofocus
          />
          <button class="flex items-center gap-1 rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800" @click="pesquisarNoChat">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            <span class="hidden md:inline">Buscar</span>
          </button>
          <button class="flex items-center rounded px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100" @click="painelBuscaChat = false; buscaNoChat = ''; chat.resultadosBuscaConversa = []">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div v-if="chat.resultadosBuscaConversa.length" class="mt-2 max-h-28 overflow-auto rounded border border-amber-200 bg-amber-50 p-2 text-xs">
          <button
            v-for="item in chat.resultadosBuscaConversa"
            :key="`find-${item.id}`"
            class="block w-full truncate rounded px-2 py-1 text-left text-amber-800 hover:bg-amber-100"
            @click="emit('go-to-message', item.id)"
          >
            #{{ item.id }} - {{ resumoMensagem(item) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '../stores/chat'
import { useCallStore } from '../stores/call'
import { resumoMensagem } from '../utils/formatters'
import type { TipoChamada } from '../types/api'

const emit = defineEmits<{
  'update:sidebar-aberta': [value: boolean]
  'start-call': [tipo: TipoChamada, comTela?: boolean]
  'go-to-message': [id: number]
}>()

const chat = useChatStore()
const call = useCallStore()

const painelBuscaChat = ref(false)
const buscaNoChat = ref('')

async function pesquisarNoChat() {
  await chat.buscarNaConversa(buscaNoChat.value)
}
</script>
