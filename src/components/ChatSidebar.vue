<template>
  <aside
    class="relative w-full flex-col border-r border-surface-300 bg-surface-200 md:max-w-[334px]"
    :class="ocultarCompleta ? 'hidden lg:flex' : sidebarAberta ? 'flex' : 'hidden md:flex'"
  >
    <div class="border-b border-surface-300 p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-sm font-semibold text-primary-700 transition hover:ring-2 hover:ring-primary-200"
            title="Ver perfil"
            @click="abrirUsuarioInfo(perfilUsuarioLogado)"
          >
            <img v-if="avatarUsuario" :src="avatarUsuario" alt="Perfil" class="h-full w-full object-cover" @error="onAvatarError" />
            <span v-else>{{ inicialUsuario }}</span>
          </button>
          <div class="min-w-0">
            <p class="truncate select-none font-semibold text-surface-800">{{ auth.user?.nome }}</p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-300 hover:text-surface-900"
            :title="isDark ? 'Tema claro' : 'Tema escuro'"
            @click="toggleTheme"
          >
            <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><circle cx="12" cy="12" r="4.5" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.25v1.5m0 16.5v1.5M4.219 4.219l1.06 1.06m12.442 12.442 1.06 1.06M2.25 12h1.5m16.5 0h1.5M4.219 19.781l1.06-1.06m12.442-12.442 1.06-1.06" /></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>
          </button>
        </div>
      </div>

      <div class="flex gap-2">
        <button class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-500 px-3 py-2 text-sm font-medium text-surface-700 transition hover:bg-surface-300" @click="mostrarBuscaContato = true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" /></svg>
          Nova conversa
        </button>
        <button class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-500 px-3 py-2 text-sm font-medium text-surface-700 transition hover:bg-surface-300" @click="emit('open-group-modal')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
          Novo grupo
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <section class="flex h-full flex-col">
        <div class="px-4 pt-4">
          <h2 class="mb-2 select-none text-xs font-semibold uppercase tracking-wide text-surface-500">Conversas</h2>
          <input
            v-model="filtroConversa"
            type="text"
            class="mb-2 w-full rounded border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-800 outline-none focus:border-primary-500"
            placeholder="Pesquisar..."
          />
        </div>
        <div class="flex-1 overflow-auto bg-surface-200">
          <div
            v-for="conversa in conversasFiltradas"
            :key="conversa.id"
            class="border-b border-surface-300 px-3 py-2"
            :class="conversa.id === chat.conversaAtivaId ? 'bg-surface-50 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent hover:bg-surface-300'"
            role="button"
            tabindex="0"
            @click="abrirConversa(conversa.id)"
            @keydown.enter.prevent="abrirConversa(conversa.id)"
            @keydown.space.prevent="abrirConversa(conversa.id)"
          >
            <div class="flex items-center gap-2">
              <button
                v-if="perfilConversa(conversa)"
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-xs font-semibold text-surface-700 transition hover:ring-2 hover:ring-primary-200"
                title="Ver perfil"
                @click.stop="abrirUsuarioInfo(perfilConversa(conversa))"
              >
                <img v-if="avatarConversa(conversa)" :src="avatarConversa(conversa) || ''" alt="Avatar" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                <span v-if="!avatarConversa(conversa)">{{ inicialConversa(conversa) }}</span>
              </button>
              <div v-else class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-xs font-semibold text-surface-700">
                <img v-if="avatarConversa(conversa)" :src="avatarConversa(conversa) || ''" alt="Avatar" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                <span v-if="!avatarConversa(conversa)">{{ inicialConversa(conversa) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between text-sm font-medium text-surface-800">
                  <div class="flex min-w-0 items-center gap-1.5">
                    <span class="truncate">{{ tituloConversa(conversa) }}</span>
                    <span
                      v-if="conversa.tipo === TipoConversa.Grupo"
                      class="shrink-0 rounded-full bg-primary-100 dark:bg-primary-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300"
                      title="Conversa em grupo"
                    >
                      Grupo
                    </span>
                  </div>
                  <span
                    v-if="(conversa.mensagens_sem_visualizar || 0) > 0"
                    class="ml-2 rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white"
                  >
                    {{ conversa.mensagens_sem_visualizar }}
                  </span>
                </div>
                <p class="truncate text-xs text-surface-500">{{ conversa.ultima_mensagem_texto || 'Sem mensagens' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="sip.sipDisponivel" class="mt-3 rounded-2xl border border-surface-200 bg-surface-base px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-surface-400">Status SIP</p>
          <div class="mt-1 flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full" :class="sipStatusBadgeClasse"></span>
            <span class="text-sm font-medium" :class="sipStatusClasse">{{ sipStatusTexto }}</span>
          </div>
        </div>

        <button
          v-if="sip.sipDisponivel"
          type="button"
          class="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-700"
          @click="abrirDiscador = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 4.5A2.25 2.25 0 0 1 4.5 2.25h15A2.25 2.25 0 0 1 21.75 4.5v15A2.25 2.25 0 0 1 19.5 21.75h-15A2.25 2.25 0 0 1 2.25 19.5v-15ZM6 6.75h.008v.008H6V6.75Zm0 4.5h.008v.008H6v-.008Zm0 4.5h.008v.008H6v-.008Zm6-9h.008v.008H12V6.75Zm0 4.5h.008v.008H12v-.008Zm0 4.5h.008v.008H12v-.008Zm6-9h.008v.008H18V6.75Zm0 4.5h.008v.008H18v-.008Zm0 4.5h.008v.008H18v-.008Z" />
          </svg>
          Discador SIP
        </button>
      </section>
    </div>

    <div v-if="mostrarBuscaContato" class="absolute inset-0 z-10 flex flex-col bg-surface-50">
      <div class="flex items-center gap-2 border-b border-surface-200 p-4">
        <button class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200" @click="mostrarBuscaContato = false; filtroContato = ''">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
        </button>
        <h2 class="text-sm font-semibold text-surface-700">Nova conversa</h2>
      </div>
      <div class="flex-1 overflow-hidden p-4">
        <input
          v-model="filtroContato"
          type="text"
          class="mb-2 w-full rounded border border-surface-300 bg-surface-100 px-2 py-1.5 text-sm text-surface-800 outline-none focus:border-primary-500"
          placeholder="Pesquisar contato"
          autofocus
        />
        <div class="max-h-[calc(100vh-14rem)] overflow-auto rounded border border-surface-200 bg-surface-base">
          <button
            v-for="contato in contatosFiltrados"
            :key="contato.id"
            class="flex w-full items-center gap-3 border-b border-surface-100 px-3 py-2 text-left text-sm hover:bg-surface-50"
            @click="selecionarContatoNovaConversa(contato.id)"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-xs font-semibold text-surface-700">
              <img v-if="avatarContato(contato)" :src="avatarContato(contato) || ''" alt="Avatar" class="h-full w-full object-cover" />
              <span v-else>{{ (contato.nome?.charAt(0) || 'C').toUpperCase() }}</span>
            </div>
            <span>{{ contato.nome }}</span>
          </button>
        </div>
      </div>
    </div>


    <SipDialerModal :aberta="abrirDiscador" @close="abrirDiscador = false" />
    <UserInfoModal :aberta="mostrarUsuarioInfo" :usuario="usuarioSelecionado" @close="fecharUsuarioInfo" />
  </aside>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useSipStore } from '../stores/sip'
import { TipoConversa } from '../types/api'
import type { Contato, Conversa } from '../types/api'
import { criarUsuarioPopup, resolverUsuarioDaConversa } from '../utils/userProfile'
import type { UsuarioPopup } from '../utils/userProfile'
import { useTheme } from '../composables/useTheme'

import UserInfoModal from './UserInfoModal.vue'
const SipDialerModal = defineAsyncComponent(() => import('./SipDialerModal.vue'))

defineProps<{
  sidebarAberta: boolean
  ocultarCompleta?: boolean
}>()

const emit = defineEmits<{
  'update:sidebarAberta': [value: boolean]
  'open-group-modal': []
  'logout': []
  'conversation-opened': []
  'open-settings': []
}>()

const auth = useAuthStore()
const chat = useChatStore()
const sip = useSipStore()
const { isDark, toggle: toggleTheme } = useTheme()

const filtroContato = ref('')
const filtroConversa = ref('')
const mostrarBuscaContato = ref(false)

const abrirDiscador = ref(false)
const mostrarUsuarioInfo = ref(false)
const usuarioSelecionado = ref<UsuarioPopup | null>(null)

const avatarUsuario = computed(() => auth.avatarUrl || '')

const perfilUsuarioLogado = computed(() => {
  if (!auth.user) return null
  return criarUsuarioPopup({
    ...auth.user,
    avatar_url: avatarUsuario.value || auth.user.avatar_url || ''
  })
})

const inicialUsuario = computed(() => {
  const nome = auth.user?.nome?.trim() || auth.user?.login?.trim() || 'U'
  return nome.charAt(0).toUpperCase()
})

const contatosFiltrados = computed(() => {
  const termo = filtroContato.value.trim().toLowerCase()
  if (!termo) return chat.contatos
  return chat.contatos.filter((item: Contato) => {
    return (
      item.nome.toLowerCase().includes(termo) ||
      item.login.toLowerCase().includes(termo) ||
      item.email.toLowerCase().includes(termo)
    )
  })
})

const conversasFiltradas = computed(() => {
  const termo = filtroConversa.value.trim().toLowerCase()
  const lista = termo
    ? chat.conversas.filter((item: Conversa) => {
        const titulo = (item.descricao || item.nome || '').toLowerCase()
        const ultima = (item.ultima_mensagem_texto || '').toLowerCase()
        return titulo.includes(termo) || ultima.includes(termo)
      })
    : [...chat.conversas]
  return lista.sort((a, b) => (b.mensagem_id ?? 0) - (a.mensagem_id ?? 0))
})

const sipStatusTexto = computed(() => {
  if (!sip.sipConfig) return 'Sem configuracao'
  if (!sip.sipDisponivel) return 'Ramal inativo'
  if (sip.isRegistered) return 'Registrado'
  if (sip.isConnecting || sip.processandoConexao) return 'Conectando'
  if (sip.isConnected) return 'Conectado sem registro'
  if (sip.erro) return 'Falha na conexao'
  return 'Desconectado'
})

const sipStatusClasse = computed(() => {
  if (!sip.sipDisponivel) return 'text-surface-600'
  if (sip.isRegistered) return 'text-success-700 dark:text-success-400'
  if (sip.isConnecting || sip.processandoConexao) return 'text-warning-700 dark:text-warning-400'
  if (sip.erro) return 'text-danger-700 dark:text-danger-400'
  return 'text-surface-700'
})

const sipStatusBadgeClasse = computed(() => {
  if (!sip.sipDisponivel) return 'bg-surface-300'
  if (sip.isRegistered) return 'bg-success-500'
  if (sip.isConnecting || sip.processandoConexao) return 'bg-warning-400'
  if (sip.erro) return 'bg-danger-500'
  return 'bg-surface-300'
})

watch(() => auth.user?.id, () => {
  void sip.inicializarSessao(true)
})

onMounted(() => {
  void sip.inicializarSessao(false)
})

function tituloConversa(conversa: Conversa) {
  return conversa.descricao || conversa.nome || `Conversa #${conversa.id}`
}

function inicialConversa(conversa: Conversa) {
  const nome = tituloConversa(conversa).trim()
  return (nome.charAt(0) || 'C').toUpperCase()
}

function avatarConversa(conversa: Conversa) {
  return conversa.avatar_url || ''
}

function perfilConversa(conversa: Conversa) {
  return resolverUsuarioDaConversa(conversa, chat.contatos)
}

function abrirUsuarioInfo(usuario: UsuarioPopup | null) {
  if (!usuario) return
  usuarioSelecionado.value = usuario
  mostrarUsuarioInfo.value = true
}

function fecharUsuarioInfo() {
  mostrarUsuarioInfo.value = false
  usuarioSelecionado.value = null
}

function onAvatarError() {
  void auth.resolverAvatarUrl()
}

function avatarContato(contato: Contato) {
  const conversaDireta = chat.conversas.find((conversa) =>
    conversa.tipo === TipoConversa.Direta && conversa.destinatario_id === contato.id
  )
  return contato.avatar_url || conversaDireta?.avatar_url || ''
}

async function abrirConversa(conversaId: number) {
  try {
    await chat.selecionarConversa(conversaId)
    emit('update:sidebarAberta', false)
    emit('conversation-opened')
  } catch {
    // handled by parent
  }
}

async function selecionarContatoNovaConversa(contatoId: number) {
  mostrarBuscaContato.value = false
  filtroContato.value = ''
  const contato = chat.contatos.find((item: Contato) => item.id === contatoId)
  if (!contato) return

  try {
    await chat.iniciarConversaDireta(contato)
    emit('update:sidebarAberta', false)
    emit('conversation-opened')
  } catch {
    // handled by parent
  }
}


</script>
