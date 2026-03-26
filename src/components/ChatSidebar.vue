<template>
  <aside
    class="relative w-full flex-col border-r border-surface-300 bg-surface-200 md:max-w-[290px]"
    :class="ocultarCompleta ? 'hidden lg:flex' : sidebarAberta ? 'flex' : 'hidden md:flex'"
  >
    <div class="flex-1 overflow-hidden">
      <section class="flex h-full flex-col">
        <div class="px-4 pt-2">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="select-none text-xs font-semibold uppercase tracking-wide text-surface-500">Conversas</h2>
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-300 hover:text-surface-700"
              title="Novo grupo"
              @click="emit('open-group-modal')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
            </button>
          </div>
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
            class="group/conv border-b border-surface-300 px-3 py-2"
            :class="conversa.id === chat.conversaAtivaId ? 'bg-surface-50' : 'hover:bg-surface-300'"
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
              <button
                class="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-surface-700 md:group-hover/conv:flex"
                title="Abrir em nova janela"
                @click.stop="emit('popout', conversa.id)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
              </button>
            </div>
          </div>

          <!-- Contatos sem conversa (quando pesquisando) -->
          <template v-if="filtroConversa.trim() && contatosSemConversa.length">
            <div class="flex items-center gap-2 border-b border-surface-300 px-4 py-2">
              <span class="text-xs font-semibold uppercase tracking-wide text-surface-400">Nova conversa</span>
              <div class="h-px flex-1 bg-surface-300" />
            </div>
            <button
              v-for="contato in contatosSemConversa"
              :key="'contato-' + contato.id"
              class="flex w-full items-center gap-2 border-b border-surface-300 px-3 py-2 text-left hover:bg-surface-300"
              @click="selecionarContatoNovaConversa(contato.id)"
            >
              <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-xs font-semibold text-surface-700">
                <img v-if="avatarContato(contato)" :src="avatarContato(contato) || ''" alt="Avatar" class="h-full w-full object-cover" />
                <span v-else>{{ (contato.nome?.charAt(0) || 'C').toUpperCase() }}</span>
              </div>
              <span class="truncate text-sm font-medium text-surface-800">{{ contato.nome }}</span>
            </button>
          </template>
        </div>

      </section>
    </div>

    <UserInfoModal :aberta="mostrarUsuarioInfo" :usuario="usuarioSelecionado" @close="fecharUsuarioInfo" />
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useSipStore } from '../stores/sip'
import { TipoConversa } from '../types/api'
import type { Contato, Conversa } from '../types/api'
import { criarUsuarioPopup, resolverUsuarioDaConversa } from '../utils/userProfile'
import type { UsuarioPopup } from '../utils/userProfile'

import UserInfoModal from './UserInfoModal.vue'

defineProps<{
  sidebarAberta: boolean
  ocultarCompleta?: boolean
}>()

const emit = defineEmits<{
  'update:sidebarAberta': [value: boolean]
  'open-group-modal': []
  'conversation-opened': []
  'popout': [conversaId: number]
}>()

const auth = useAuthStore()
const chat = useChatStore()
const sip = useSipStore()
const filtroConversa = ref('')

const mostrarUsuarioInfo = ref(false)
const usuarioSelecionado = ref<UsuarioPopup | null>(null)

const perfilUsuarioLogado = computed(() => {
  if (!auth.user) return null
  return criarUsuarioPopup({
    ...auth.user,
    avatar_url: auth.avatarUrl || auth.user.avatar_url || ''
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

const contatosSemConversa = computed(() => {
  const termo = filtroConversa.value.trim().toLowerCase()
  if (!termo) return []
  const idsComConversa = new Set(
    chat.conversas
      .filter((c: Conversa) => c.tipo === TipoConversa.Direta)
      .map((c: Conversa) => c.destinatario_id)
  )
  return chat.contatos.filter((contato: Contato) => {
    if (idsComConversa.has(contato.id)) return false
    return (
      contato.nome.toLowerCase().includes(termo) ||
      contato.login.toLowerCase().includes(termo) ||
      contato.email.toLowerCase().includes(termo)
    )
  })
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
  filtroConversa.value = ''
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
