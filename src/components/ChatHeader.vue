<template>
  <div class="border-b border-surface-300 bg-surface-50 px-4 py-1.5">
    <div class="mx-auto w-full max-w-[850px]">
      <div class="flex items-center justify-between">
        <div class="flex min-w-0 items-center gap-2">
          <button
            v-if="!props.popout"
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200 md:hidden"
            @click="emit('update:sidebar-aberta', true)"
>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          </button>
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-sm font-semibold text-surface-800 transition hover:ring-2 hover:ring-surface-300"
            :disabled="!perfilConversaAtiva"
            :class="perfilConversaAtiva ? 'cursor-pointer' : 'cursor-default'"
            @click="abrirUsuarioInfo(perfilConversaAtiva)"
          >
            <img v-if="avatarConversa" :src="avatarConversa" alt="Avatar" class="h-full w-full object-cover" @error="ocultarAvatar = true" />
            <span v-else>{{ inicialConversa }}</span>
          </button>
          <div class="group relative min-w-0">
            <h2 class="truncate select-none text-lg font-semibold leading-tight text-surface-800">
              {{ chat.conversaAtiva?.descricao || chat.conversaAtiva?.nome || `Conversa #${chat.conversaAtiva?.id}` }}
            </h2>
            <div class="typing-subtitle" :class="atividadeVisivel ? 'typing-subtitle-open' : ''">
              <div class="flex max-w-[300px] items-center gap-2.5">
                <span class="flex items-end gap-[2px]">
                  <span class="typing-dot" :style="{ animationDelay: '0ms', background: corAtividade }"></span>
                  <span class="typing-dot" :style="{ animationDelay: '200ms', background: corAtividade }"></span>
                  <span class="typing-dot" :style="{ animationDelay: '400ms', background: corAtividade }"></span>
                </span>
                <span class="truncate text-[10px]" :class="chat.gravandoNaConversaAtiva.length ? 'text-danger-500/70' : 'text-primary-500/70'">{{ textoAtividade }}</span>
              </div>
            </div>
            <p
              v-if="!atividadeVisivel && isGrupo && chat.usuariosConversaAtiva.length"
              class="max-w-[300px] truncate text-xs text-surface-500"
            >
              {{ nomesMembrosGrupo }}
            </p>
            <div
              v-if="isGrupo && chat.usuariosConversaAtiva.length"
              class="invisible absolute left-0 top-full z-20 max-h-48 min-w-[200px] overflow-y-auto rounded-lg border border-surface-200 bg-surface-base py-1 shadow-lg group-hover:visible"
              style="margin-top: -2px; padding-top: 6px"
            >
              <button
                v-for="u in chat.usuariosConversaAtiva"
                :key="u.usuario_id"
                class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-surface-700 transition hover:bg-surface-100"
                @click="abrirChatComMembro(u.usuario_id)"
              >
                <div class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-xs font-semibold text-surface-600">
                  <img v-if="avatarMembro(u)" :src="avatarMembro(u)!" alt="" class="h-full w-full object-cover" />
                  <span v-else>{{ u.nome.charAt(0).toUpperCase() }}</span>
                </div>
                <span class="truncate">{{ u.nome }}</span>
              </button>
            </div>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <!-- Barra de busca inline (desktop) -->
          <div class="relative hidden md:flex">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-600"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            <input
              v-model="buscaNoChat"
              type="text"
              class="w-56 rounded-full bg-surface-200 py-1.5 pl-8 pr-8 text-sm text-surface-800 outline-none placeholder:text-surface-500 focus:ring-1 focus:ring-primary-400"
              placeholder="Pesquisar..."
              @keyup.enter="pesquisarNoChat"
            />
            <button
              v-if="buscaNoChat"
              class="absolute right-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-surface-500 hover:text-surface-800"
              @click="buscaNoChat = ''; chat.resultadosBuscaConversa = []"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
            title="Chamada de voz"
            @click="emit('start-call', 1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
          </button>
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
            title="Chamada de video"
            @click="emit('start-call', 2)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          </button>
          <button
            v-if="!call.emChamada && !call.recebendoChamada"
            class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
            title="Compartilhar tela"
            @click="emit('start-call', 2, true)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
          </button>
          <button
            v-if="isGrupo"
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200"
            title="Gerenciar membros"
            @click="emit('open-group-members')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-surface-600"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
          </button>
          <!-- Botão de busca (mobile) -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200 md:hidden"
            title="Pesquisar na conversa"
            @click="painelBuscaChat = !painelBuscaChat; if (!painelBuscaChat) { buscaNoChat = ''; chat.resultadosBuscaConversa = [] }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-surface-600"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          </button>
        </div>
      </div>

      <!-- Painel de busca mobile -->
      <div v-if="painelBuscaChat" class="mt-2 md:hidden">
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
          </button>
          <button class="flex items-center rounded px-2 py-1.5 text-sm text-surface-500 hover:bg-surface-100" @click="painelBuscaChat = false; buscaNoChat = ''; chat.resultadosBuscaConversa = []">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <!-- Resultados de busca -->
      <div v-if="chat.resultadosBuscaConversa.length" class="mt-2 max-h-28 overflow-auto rounded border border-warning-200 bg-warning-50 dark:bg-warning-900 p-2 text-xs">
        <button
          v-for="item in resultadosBuscaOrdenados"
          :key="`find-${item.id}`"
          class="block w-full cursor-pointer truncate rounded px-2 py-1 text-left text-warning-800 dark:text-warning-300 hover:bg-surface-200 dark:hover:bg-warning-800"
          @click="emit('go-to-message', item.id)"
        >
          #{{ item.id }} - {{ resumoMensagem(item) }}
        </button>
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

const props = withDefaults(defineProps<{
  popout?: boolean
}>(), { popout: false })

const emit = defineEmits<{
  'update:sidebar-aberta': [value: boolean]
  'start-call': [tipo: TipoChamada, comTela?: boolean]
  'go-to-message': [id: number]
  'open-group-members': []
  'open-chat-with': [usuarioId: number]
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

function formatarAtividade(nomes: string[], acao: string, acaoPlural: string): string {
  if (nomes.length === 0) return ''
  if (!isGrupo.value) return `${acao}...`
  if (nomes.length === 1) return `${nomes[0]} está ${acao.toLowerCase()}...`
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]} ${acaoPlural.toLowerCase()}...`
  if (nomes.length === 3) return `${nomes[0]}, ${nomes[1]} e ${nomes[2]} ${acaoPlural.toLowerCase()}...`
  return `${nomes[0]}, ${nomes[1]}, ${nomes[2]} e outras ${nomes.length - 3} pessoas ${acaoPlural.toLowerCase()}...`
}

const textoDigitando = computed(() =>
  formatarAtividade(chat.digitandoNaConversaAtiva, 'Digitando', 'estão digitando')
)

const textoGravando = computed(() =>
  formatarAtividade(chat.gravandoNaConversaAtiva, 'Gravando áudio', 'estão gravando áudio')
)

const atividadeVisivel = computed(() =>
  chat.digitandoNaConversaAtiva.length > 0 || chat.gravandoNaConversaAtiva.length > 0
)

const textoAtividade = computed(() =>
  chat.gravandoNaConversaAtiva.length ? textoGravando.value : textoDigitando.value
)

const corAtividade = computed(() =>
  chat.gravandoNaConversaAtiva.length ? 'var(--color-danger-500)' : 'var(--color-primary-500)'
)

watch(() => chat.conversaAtiva, (conversa) => {
  ocultarAvatar.value = false
  if (conversa && conversa.tipo === TipoConversa.Grupo) {
    void chat.carregarUsuariosConversa(conversa.id)
  }
}, { immediate: true })

const resultadosBuscaOrdenados = computed(() => [...chat.resultadosBuscaConversa].reverse())

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

function avatarMembro(u: { avatar_url?: string | null }): string | null {
  return u.avatar_url || null
}

function abrirChatComMembro(usuarioId: number) {
  const contato = chat.contatos.find(c => c.id === usuarioId)
  if (contato) {
    void chat.iniciarConversaDireta(contato)
    emit('open-chat-with', usuarioId)
  }
}

async function pesquisarNoChat() {
  await chat.buscarNaConversa(buscaNoChat.value)
}
</script>

<style>
@keyframes typing-wave {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
}
.typing-dot {
  display: inline-block;
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  animation: typing-wave 1.2s ease-in-out infinite;
}
.typing-subtitle {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.25s ease, opacity 0.2s ease;
}
.typing-subtitle > * {
  overflow: hidden;
}
.typing-subtitle-open {
  grid-template-rows: 1fr;
  opacity: 1;
}
</style>
