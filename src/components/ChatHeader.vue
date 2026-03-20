<template>
  <div class="border-b border-surface-200 p-4">
    <div class="mx-auto w-full max-w-[1200px]">
      <div class="mb-2 flex items-center justify-between">
        <div class="flex min-w-0 items-center gap-2">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200 md:hidden"
            @click="emit('update:sidebar-aberta', true)"
>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          </button>
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-sm font-semibold text-primary-700 transition hover:ring-2 hover:ring-primary-200"
            :disabled="!perfilConversaAtiva"
            :class="perfilConversaAtiva ? 'cursor-pointer' : 'cursor-default'"
            @click="abrirUsuarioInfo(perfilConversaAtiva)"
          >
            <img v-if="avatarConversa" :src="avatarConversa" alt="Avatar" class="h-full w-full object-cover" @error="ocultarAvatar = true" />
            <span v-else>{{ inicialConversa }}</span>
          </button>
          <div class="group relative min-w-0">
            <h2 class="truncate select-none text-lg font-semibold text-surface-800">
              {{ chat.conversaAtiva?.descricao || chat.conversaAtiva?.nome || `Conversa #${chat.conversaAtiva?.id}` }}
            </h2>
            <p
              v-if="isGrupo && chat.usuariosConversaAtiva.length"
              class="max-w-[300px] truncate text-xs text-surface-500"
            >
              {{ nomesMembrosGrupo }}
            </p>
            <div
              v-if="isGrupo && chat.usuariosConversaAtiva.length"
              class="invisible absolute left-0 top-full z-20 mt-1 max-h-48 min-w-[180px] overflow-y-auto rounded border border-surface-200 bg-surface-base py-1 shadow-lg group-hover:visible"
            >
              <div
                v-for="u in chat.usuariosConversaAtiva"
                :key="u.usuario_id"
                class="px-3 py-1.5 text-sm text-surface-700"
              >
                {{ u.nome }}
              </div>
            </div>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex items-center gap-1 rounded-lg bg-success-100 px-2.5 py-1.5 text-sm text-success-700 hover:bg-success-200 dark:bg-success-900 dark:hover:bg-success-800 dark:text-success-400"
            title="Chamada de voz"
            @click="emit('start-call', 1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
            <span class="hidden md:inline">Ligar</span>
          </button>
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex items-center gap-1 rounded-lg bg-primary-100 px-2.5 py-1.5 text-sm text-primary-700 hover:bg-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 dark:text-primary-400"
            title="Chamada de video"
            @click="emit('start-call', 2)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            <span class="hidden md:inline">Video</span>
          </button>
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1.5 text-sm text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 dark:text-purple-400"
            title="Compartilhar tela"
            @click="emit('start-call', 2, true)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
            <span class="hidden md:inline">Tela</span>
          </button>
          <button
            v-if="isGrupo"
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200"
            title="Gerenciar membros"
            @click="emit('open-group-members')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-surface-600"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
          </button>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200"
            title="Pesquisar na conversa"
            @click="painelBuscaChat = !painelBuscaChat; if (!painelBuscaChat) { buscaNoChat = ''; chat.resultadosBuscaConversa = [] }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-surface-600"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          </button>
        </div>
      </div>

      <div v-if="painelBuscaChat" class="mt-2">
        <div class="flex gap-2">
          <input
            v-model="buscaNoChat"
            type="text"
            class="w-full rounded border border-surface-300 px-3 py-1.5 text-sm bg-surface-100 outline-none focus:border-primary-500 text-surface-800"
            placeholder="Pesquisar nesta conversa"
            @keyup.enter="pesquisarNoChat"
            autofocus
          />
          <button class="flex items-center gap-1 rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700" @click="pesquisarNoChat">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            <span class="hidden md:inline">Buscar</span>
          </button>
          <button class="flex items-center rounded px-2 py-1.5 text-sm text-surface-500 hover:bg-surface-100" @click="painelBuscaChat = false; buscaNoChat = ''; chat.resultadosBuscaConversa = []">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div v-if="chat.resultadosBuscaConversa.length" class="mt-2 max-h-28 overflow-auto rounded border border-amber-200 bg-amber-50 dark:bg-amber-900 p-2 text-xs">
          <button
            v-for="item in chat.resultadosBuscaConversa"
            :key="`find-${item.id}`"
            class="block w-full truncate rounded px-2 py-1 text-left text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800"
            @click="emit('go-to-message', item.id)"
          >
            #{{ item.id }} - {{ resumoMensagem(item) }}
          </button>
        </div>
      </div>
    </div>

    <UserInfoModal :aberta="mostrarUsuarioInfo" :usuario="usuarioSelecionado" @close="fecharUsuarioInfo" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useCallStore } from '../stores/call'
import { resumoMensagem } from '../utils/formatters'
import { TipoConversa } from '../types/api'
import type { TipoChamada } from '../types/api'
import { resolverUsuarioDaConversa } from '../utils/userProfile'
import type { UsuarioPopup } from '../utils/userProfile'
import UserInfoModal from './UserInfoModal.vue'

const emit = defineEmits<{
  'update:sidebar-aberta': [value: boolean]
  'start-call': [tipo: TipoChamada, comTela?: boolean]
  'go-to-message': [id: number]
  'open-group-members': []
}>()

const chat = useChatStore()
const call = useCallStore()

const isGrupo = computed(() => chat.conversaAtiva?.tipo === TipoConversa.Grupo)
const ocultarAvatar = ref(false)
const mostrarUsuarioInfo = ref(false)
const usuarioSelecionado = ref<UsuarioPopup | null>(null)

const avatarConversa = computed(() => {
  if (ocultarAvatar.value) return ''
  return chat.conversaAtiva?.avatar_url || ''
})

const perfilConversaAtiva = computed(() => {
  if (!chat.conversaAtiva) return null
  return resolverUsuarioDaConversa(chat.conversaAtiva, chat.contatos)
})

const inicialConversa = computed(() => {
  const nome = chat.conversaAtiva?.descricao || chat.conversaAtiva?.nome || `Conversa #${chat.conversaAtiva?.id || ''}`
  return (nome.trim().charAt(0) || 'C').toUpperCase()
})

const nomesMembrosGrupo = computed(() => {
  return chat.usuariosConversaAtiva.map((u: { nome: string }) => u.nome).join(', ')
})

watch(() => chat.conversaAtiva, (conversa) => {
  ocultarAvatar.value = false
  if (conversa && conversa.tipo === TipoConversa.Grupo) {
    void chat.carregarUsuariosConversa(conversa.id)
  }
}, { immediate: true })

const painelBuscaChat = ref(false)
const buscaNoChat = ref('')

function abrirUsuarioInfo(usuario: UsuarioPopup | null) {
  if (!usuario) return
  usuarioSelecionado.value = usuario
  mostrarUsuarioInfo.value = true
}

function fecharUsuarioInfo() {
  mostrarUsuarioInfo.value = false
  usuarioSelecionado.value = null
}

async function pesquisarNoChat() {
  await chat.buscarNaConversa(buscaNoChat.value)
}
</script>
