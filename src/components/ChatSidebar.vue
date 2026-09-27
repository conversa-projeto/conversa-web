<template>
  <aside
    class="relative w-full flex-col border-r border-surface-300 bg-surface-200 md:max-w-[290px]"
    :class="ocultarCompleta ? 'hidden lg:flex' : sidebarAberta ? 'flex' : 'hidden md:flex'"
  >
    <PesquisaAvancada
      v-if="pesquisaAvancadaAberta"
      :termo-inicial="filtroConversa"
      class="absolute inset-0 z-10"
      @close="pesquisaAvancadaAberta = false; filtroConversa = ''"
      @open-message="abrirMensagemPesquisa"
    />

    <div class="flex-1 overflow-hidden">
      <section class="flex h-full flex-col">
        <div class="flex items-end px-3 pb-3" style="height: 64px">
          <div class="relative flex min-w-0 flex-1 items-center rounded-full border border-surface-300 bg-surface-50 pr-1 focus-within:border-primary-500">
            <input
              v-model="filtroConversa"
              type="text"
              class="min-w-0 flex-1 bg-transparent pl-4 pr-1 py-1.5 text-sm text-surface-800 outline-none"
              placeholder="Pesquisar..."
            />
            <button
              type="button"
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:text-surface-700"
              title="Pesquisar em todos os chats"
              @click="pesquisaAvancadaAberta = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
            </button>
            <button
              type="button"
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-surface-500 transition hover:text-surface-700"
              title="Novo grupo"
              @click="emit('open-group-modal')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
            </button>
          </div>
        </div>
        <div class="flex flex-1 flex-col overflow-auto bg-surface-200">
          <template v-for="{ chave, conversa } in itensLista" :key="chave">
          <button
            v-if="!conversa"
            type="button"
            class="mt-auto flex w-full shrink-0 items-center gap-1.5 border-y border-surface-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-surface-500 transition hover:bg-surface-300"
            @click="mostrarArquivadas = !mostrarArquivadas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 transition-transform" :class="mostrarArquivadas ? 'rotate-90' : ''">
              <path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
            Arquivadas ({{ totalArquivadas }})
          </button>
          <div
            v-else
            class="group/conv relative border-b border-surface-300 px-3 py-2"
            :class="[
              conversa.id === chat.conversaAtivaId ? 'bg-surface-50' : 'hover:bg-surface-300',
              arraste?.id === conversa.id ? 'opacity-50' : '',
              arraste?.alvoId === conversa.id && arraste.id !== conversa.id
                ? (arraste.depois ? 'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary-500' : 'before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:bg-primary-500')
                : ''
            ]"
            role="button"
            tabindex="0"
            :draggable="podeArrastar(conversa)"
            @dragstart="iniciarArraste($event, conversa)"
            @dragover="sobreArraste($event, conversa)"
            @drop.prevent="soltarArraste"
            @dragend="arraste = null"
            @contextmenu.prevent="abrirMenuConversa($event, conversa)"
            @click="abrirConversa(conversa.id)"
            @keydown.enter.prevent="abrirConversa(conversa.id)"
            @keydown.space.prevent="abrirConversa(conversa.id)"
          >
            <div class="flex items-center gap-2">
              <div class="relative shrink-0">
                <button
                  v-if="perfilConversa(conversa)"
                  type="button"
                  class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-xs font-semibold text-surface-700 transition hover:ring-2 hover:ring-primary-200"
                  title="Ver perfil"
                  @click.stop="abrirUsuarioInfo(perfilConversa(conversa), conversa.id)"
                >
                  <img v-if="avatarConversa(conversa)" :src="avatarConversa(conversa) || ''" alt="Avatar" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                  <span v-if="!avatarConversa(conversa)">{{ inicialConversa(conversa) }}</span>
                </button>
                <div v-else class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-xs font-semibold text-surface-700">
                  <img v-if="avatarConversa(conversa)" :src="avatarConversa(conversa) || ''" alt="Avatar" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                  <span v-if="!avatarConversa(conversa)">{{ inicialConversa(conversa) }}</span>
                </div>
                <span
                  v-if="conversa.destinatario_id && chat.estaOnline(conversa.destinatario_id)"
                  class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success-500 ring-[1.5px] ring-surface-base"
                />
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
                    <span
                      v-if="conversa.arquivada_em && filtroConversa.trim()"
                      class="shrink-0 rounded-full bg-surface-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-surface-600"
                    >
                      Arquivada
                    </span>
                    <svg
                      v-if="conversa.fixada_ordem != null && !conversa.arquivada_em"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke="currentColor"
                      class="h-3.5 w-3.5 shrink-0 rotate-45 text-surface-500"
                    >
                      <title>Fixada</title>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 17v5M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                    </svg>
                  </div>
                  <span
                    v-if="(conversa.mensagens_sem_visualizar || 0) > 0 && !conversa.arquivada_em"
                    class="ml-2 rounded-full bg-primary-600 px-2 py-0.5 text-xs text-white"
                  >
                    {{ conversa.mensagens_sem_visualizar }}
                  </span>
                </div>
                <p class="truncate text-xs text-surface-500">{{ resumirTexto(conversa.ultima_mensagem_texto || '') || 'Sem mensagens' }}</p>
              </div>
              <div
                v-if="conversasComDigitando.has(conversa.id)"
                class="mr-2 flex shrink-0 items-center gap-0.5 md:group-hover/conv:hidden"
                title="Digitando..."
              >
                <span class="typing-dot" style="animation-delay: 0ms; background: var(--color-primary-500)"></span>
                <span class="typing-dot" style="animation-delay: 200ms; background: var(--color-primary-500)"></span>
                <span class="typing-dot" style="animation-delay: 400ms; background: var(--color-primary-500)"></span>
              </div>
              <button
                class="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-surface-700 md:group-hover/conv:flex"
                title="Mais opções"
                @click.stop="abrirMenuConversa($event, conversa)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4"><path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" /></svg>
              </button>
              <button
                class="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-surface-500 hover:bg-surface-200 hover:text-surface-700 md:group-hover/conv:flex"
                title="Abrir em nova janela"
                @click.stop="emit('popout', conversa.id)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
              </button>
            </div>
          </div>

          </template>

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
              <div class="relative shrink-0">
                <div class="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-xs font-semibold text-surface-700">
                  {{ inicialNome(contato.nome || '', 'C') }}
                  <img v-if="avatarContato(contato)" :src="avatarContato(contato)" alt="Avatar" class="absolute inset-0 h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                </div>
                <span
                  v-if="chat.estaOnline(contato.id)"
                  class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success-500 ring-[1.5px] ring-surface-base"
                />
              </div>
              <span class="truncate text-sm font-medium text-surface-800">{{ contato.nome }}</span>
            </button>
          </template>
        </div>

      </section>
    </div>

    <!-- Menu da conversa: fixar, ordenar as fixadas e arquivar -->
    <div
      v-if="menuConversa"
      ref="menuConversaEl"
      class="fixed z-50 min-w-[170px] rounded-lg border border-surface-200 bg-surface-base py-1 shadow-lg"
      :style="{ left: menuConversa.x + 'px', top: menuConversa.y + 'px' }"
      @click.stop
      @contextmenu.prevent
    >
      <button
        v-for="acao in acoesMenuConversa"
        :key="acao.rotulo"
        type="button"
        class="flex w-full items-center px-3 py-1.5 text-left text-sm text-surface-700 transition hover:bg-surface-100"
        @click="executarAcaoConversa(acao.executar)"
      >
        {{ acao.rotulo }}
      </button>
    </div>

    <UserInfoModal
      :aberta="mostrarUsuarioInfo"
      :usuario="usuarioSelecionado"
      :conversa-id="conversaIdInfo"
      @close="fecharUsuarioInfo"
      @open-anexos="(id) => { fecharUsuarioInfo(); emit('open-anexos', id) }"
    />
  </aside>
</template>

<script setup lang="ts">
import { inicialNome, resumirTexto } from '../utils/formatters'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useSipStore } from '../stores/sip'
import { TipoConversa } from '../types/api'
import type { Contato, Conversa } from '../types/api'
import { criarUsuarioPopup, resolverUsuarioDaConversa } from '../utils/userProfile'
import type { UsuarioPopup } from '../utils/userProfile'

import UserInfoModal from './UserInfoModal.vue'
import PesquisaAvancada from './PesquisaAvancada.vue'

defineProps<{
  sidebarAberta: boolean
  ocultarCompleta?: boolean
}>()

const emit = defineEmits<{
  'update:sidebarAberta': [value: boolean]
  'open-group-modal': []
  'conversation-opened': []
  'popout': [conversaId: number]
  'open-search-message': [conversaId: number, mensagemId: number]
  'open-anexos': [conversaId: number]
}>()

const auth = useAuthStore()
const chat = useChatStore()
const sip = useSipStore()
const filtroConversa = ref('')
const pesquisaAvancadaAberta = ref(false)

const mostrarUsuarioInfo = ref(false)
const usuarioSelecionado = ref<UsuarioPopup | null>(null)
const conversaIdInfo = ref<number | null>(null)

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

const mostrarArquivadas = ref(false)
const totalArquivadas = computed(() => chat.conversas.filter((c) => c.arquivada_em).length)

// Fixadas primeiro, na ordem escolhida; depois as demais pela mensagem mais
// recente. Sem pesquisa, as arquivadas ficam numa seção recolhível no fim
// (item sem conversa é o cabeçalho dela); pesquisando, aparecem junto.
const itensLista = computed(() => {
  const porRecente = (a: Conversa, b: Conversa) => (b.mensagem_id ?? 0) - (a.mensagem_id ?? 0)
  const fixada = (c: Conversa) => c.fixada_ordem != null && !c.arquivada_em
  const ordenar = (lista: Conversa[]) => [
    ...lista.filter(fixada).sort((a, b) => a.fixada_ordem! - b.fixada_ordem!),
    ...lista.filter((c) => !fixada(c)).sort(porRecente),
  ]
  const item = (conversa: Conversa): { chave: string; conversa: Conversa | null } => ({ chave: String(conversa.id), conversa })

  if (filtroConversa.value.trim()) return ordenar(conversasFiltradas.value).map(item)
  const itens = ordenar(conversasFiltradas.value.filter((c) => !c.arquivada_em)).map(item)
  const arquivadas = conversasFiltradas.value.filter((c) => c.arquivada_em).sort(porRecente)
  if (arquivadas.length) {
    itens.push({ chave: 'arquivadas', conversa: null })
    if (mostrarArquivadas.value) itens.push(...arquivadas.map(item))
  }
  return itens
})

// --- Arrastar para ordenar as fixadas ---

const arraste = ref<{ id: number; alvoId: number | null; depois: boolean } | null>(null)

function podeArrastar(conversa: Conversa) {
  return conversa.fixada_ordem != null && !conversa.arquivada_em && !filtroConversa.value.trim()
}

function iniciarArraste(event: DragEvent, conversa: Conversa) {
  if (!podeArrastar(conversa) || !event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(conversa.id))
  arraste.value = { id: conversa.id, alvoId: null, depois: false }
}

// Metade de cima da linha: cai antes dela; metade de baixo: depois
function sobreArraste(event: DragEvent, conversa: Conversa) {
  if (!arraste.value || !podeArrastar(conversa)) return
  event.preventDefault()
  const caixa = (event.currentTarget as HTMLElement).getBoundingClientRect()
  arraste.value.alvoId = conversa.id
  arraste.value.depois = event.clientY > caixa.top + caixa.height / 2
}

async function soltarArraste() {
  const soltado = arraste.value
  arraste.value = null
  if (!soltado?.alvoId || soltado.alvoId === soltado.id) return
  try {
    await chat.moverFixada(soltado.id, soltado.alvoId, soltado.depois)
  } catch (e) {
    console.error('Erro ao reordenar as fixadas', e)
  }
}

// --- Menu da conversa ---

const menuConversa = ref<{ x: number; y: number; conversa: Conversa } | null>(null)
const menuConversaEl = ref<HTMLElement | null>(null)

// Abre no ponto do clique e, depois de renderizado, recua pelo tamanho real
// do menu se ele passar da borda da janela
async function abrirMenuConversa(event: MouseEvent, conversa: Conversa) {
  menuConversa.value = { x: event.clientX, y: event.clientY, conversa }
  await nextTick()
  const caixa = menuConversaEl.value?.getBoundingClientRect()
  if (!menuConversa.value || !caixa) return
  menuConversa.value.x = Math.max(0, Math.min(event.clientX, window.innerWidth - caixa.width - 8))
  menuConversa.value.y = Math.max(0, Math.min(event.clientY, window.innerHeight - caixa.height - 8))
}

function fecharMenuConversa() {
  menuConversa.value = null
}

const acoesMenuConversa = computed(() => {
  const conversa = menuConversa.value?.conversa
  if (!conversa) return []
  const acoes: Array<{ rotulo: string; executar: () => Promise<void> }> = []
  if (!conversa.arquivada_em) {
    const fixadas = chat.conversasFixadas.map((c) => c.id)
    const posicao = fixadas.indexOf(conversa.id)
    if (posicao < 0) {
      acoes.push({ rotulo: 'Fixar', executar: () => chat.fixarConversa(conversa.id, true) })
    } else {
      acoes.push({ rotulo: 'Desafixar', executar: () => chat.fixarConversa(conversa.id, false) })
    }
    acoes.push({ rotulo: 'Arquivar', executar: () => chat.arquivarConversa(conversa.id, true) })
  } else {
    acoes.push({ rotulo: 'Desarquivar', executar: () => chat.arquivarConversa(conversa.id, false) })
  }
  return acoes
})

async function executarAcaoConversa(executar: () => Promise<void>) {
  fecharMenuConversa()
  try {
    await executar()
  } catch (e) {
    console.error('Erro ao alterar a conversa', e)
  }
}

function aoTeclarComMenu(event: KeyboardEvent) {
  if (event.key === 'Escape') fecharMenuConversa()
}

onMounted(() => {
  document.addEventListener('click', fecharMenuConversa)
  document.addEventListener('keydown', aoTeclarComMenu)
  window.addEventListener('resize', fecharMenuConversa)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', fecharMenuConversa)
  document.removeEventListener('keydown', aoTeclarComMenu)
  window.removeEventListener('resize', fecharMenuConversa)
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
  return inicialNome(nome, 'C')
}

function avatarConversa(conversa: Conversa) {
  return conversa.avatar_url || ''
}

function perfilConversa(conversa: Conversa) {
  return resolverUsuarioDaConversa(conversa, chat.contatos)
}

function abrirUsuarioInfo(usuario: UsuarioPopup | null, conversaId: number | null = null) {
  if (!usuario) return
  usuarioSelecionado.value = usuario
  conversaIdInfo.value = conversaId
  mostrarUsuarioInfo.value = true
}

function fecharUsuarioInfo() {
  mostrarUsuarioInfo.value = false
  usuarioSelecionado.value = null
  conversaIdInfo.value = null
}

// A lista de contatos nao traz foto: a sua vem do perfil e a dos outros, da
// conversa direta com eles. Sem foto (ou se ela falhar) fica a inicial.
function avatarContato(contato: Contato) {
  if (contato.id === auth.user?.id) return auth.avatarUrl || auth.user.avatar_url || ''
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

const conversasComDigitando = computed(() => {
  const resultado = new Set<number>()
  const userId = auth.user?.id
  for (const [conversaId, mapa] of chat.digitandoPorConversa) {
    if (!mapa || mapa.size === 0) continue
    if (mapa.size === 1 && userId && mapa.has(userId)) continue
    resultado.add(conversaId)
  }
  return resultado
})

function abrirMensagemPesquisa(conversaId: number, mensagemId: number) {
  emit('update:sidebarAberta', false)
  emit('open-search-message', conversaId, mensagemId)
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

<style>
@keyframes typing-wave {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-4px); }
}
.typing-dot {
  display: inline-block;
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  animation: typing-wave 1.2s ease-in-out infinite;
}
</style>
