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
          <div class="relative shrink-0">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-sm font-semibold text-surface-800 transition hover:ring-2 hover:ring-surface-300"
              :disabled="!perfilConversaAtiva && !isGrupo"
              :class="perfilConversaAtiva || isGrupo ? 'cursor-pointer' : 'cursor-default'"
              :title="isGrupo ? 'Dados do grupo' : undefined"
              @click="isGrupo ? emit('open-group-members') : abrirUsuarioInfo(perfilConversaAtiva)"
            >
              <img v-if="avatarConversa" :src="avatarConversa" alt="Avatar" class="h-full w-full object-cover" @error="ocultarAvatar = true" />
              <span v-else :class="chat.conversaAtiva?.emoji ? 'text-xl' : ''">{{ inicialConversa }}</span>
            </button>
            <IndicadorPresenca
              v-if="destinatarioId"
              :usuario-id="destinatarioId"
              class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-[1.5px] ring-surface-50"
            />
          </div>
          <div class="group relative min-w-0">
            <h2 class="flex items-center gap-2 select-none text-lg font-semibold leading-tight text-surface-800">
              <span class="truncate">{{ chat.conversaAtiva?.descricao || chat.conversaAtiva?.nome || `Conversa #${chat.conversaAtiva?.id}` }}</span>
              <span
                v-if="conversaComBot"
                class="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                title="Responde com a IA"
              >Bot</span>
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
            <p
              v-else-if="!atividadeVisivel && textoPresenca"
              class="max-w-[300px] truncate text-xs"
              :class="naConversa ? 'text-primary-600 dark:text-primary-400' : 'text-surface-500'"
            >
              {{ textoPresenca }}
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
                  <span v-else>{{ inicialNome(u.nome) }}</span>
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
              @click="limparPesquisa"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <button
            v-if="!call.emChamada && !call.recebendoChamada && auth.pode(CodigoPermissao.ChamadaAudio)"
            class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
            title="Chamada de voz"
            @click="emit('start-call', 1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
          </button>
          <button
            v-if="!call.emChamada && !call.recebendoChamada && auth.pode(CodigoPermissao.ChamadaVideo)"
            class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
            title="Chamada de video"
            @click="emit('start-call', 2)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          </button>
          <button
            v-if="!call.emChamada && !call.recebendoChamada && auth.pode(CodigoPermissao.ChamadaVideo) && auth.pode(CodigoPermissao.CompartilharTela)"
            class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
            title="Compartilhar tela"
            @click="emit('start-call', 2, true)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" /></svg>
          </button>
          <button
            v-if="recursos.ia"
            class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
            title="Resumir conversa"
            @click="mostrarResumo = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>
          </button>
          <button
            v-if="!isGrupo && !popout"
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200"
            :class="pastas.painelAberto ? 'bg-surface-200' : ''"
            title="Pastas de mensagens"
            @click="pastas.painelAberto = !pastas.painelAberto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-surface-600"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>
          </button>
          <button
            v-if="isGrupo"
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200"
            title="Participantes e anexos"
            @click="emit('open-group-members')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 text-surface-600"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
          </button>
          <!-- Botão de busca (mobile) -->
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-200 md:hidden"
            title="Pesquisar na conversa"
            @click="painelBuscaChat = !painelBuscaChat; if (!painelBuscaChat) limparPesquisa()"
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
          <button class="flex items-center rounded px-2 py-1.5 text-sm text-surface-500 hover:bg-surface-100" @click="painelBuscaChat = false; limparPesquisa()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <!-- Resultados da pesquisa: quem, quando e o trecho com o termo destacado -->
      <div
        v-if="termoPesquisado"
        class="mt-2 overflow-hidden rounded-xl border border-surface-300 bg-surface-base shadow-lg"
        data-resultados-busca
      >
        <p class="border-b border-surface-200 px-3 py-1.5 text-xs text-surface-500">
          <template v-if="resultadosBusca.length">
            {{ resultadosBusca.length }} {{ resultadosBusca.length === 1 ? 'resultado' : 'resultados' }} para “{{ termoPesquisado }}”
          </template>
          <template v-else>Nenhuma mensagem com “{{ termoPesquisado }}”</template>
        </p>
        <div v-if="resultadosBusca.length" class="max-h-64 overflow-y-auto py-1">
          <button
            v-for="item in resultadosBusca"
            :key="`find-${item.id}`"
            type="button"
            class="block w-full px-3 py-1.5 text-left transition hover:bg-surface-100"
            @click="emit('go-to-message', item.id, item.conversaId)"
          >
            <span class="flex items-baseline gap-2">
              <span class="truncate text-xs font-semibold text-surface-800">{{ item.autor }}</span>
              <span
                v-if="item.daLigacao"
                class="shrink-0 rounded-full bg-surface-200 px-1.5 text-[10px] text-surface-600"
                data-resultado-chat-ligacao
              >no chat da ligação</span>
              <span class="ml-auto shrink-0 text-[11px] text-surface-500">{{ item.quando }}</span>
            </span>
            <span class="block truncate text-sm text-surface-600">
              <template v-for="(parte, i) in item.partes" :key="i"><mark
                v-if="parte.destaque"
                class="rounded-sm bg-primary-100 px-0.5 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
              >{{ parte.texto }}</mark><template v-else>{{ parte.texto }}</template></template>
            </span>
          </button>
        </div>
      </div>
    </div>

    <ResumoConversaModal
      v-if="mostrarResumo && chat.conversaAtivaId"
      :conversa-id="chat.conversaAtivaId"
      @close="mostrarResumo = false"
      @go-to-message="(id) => { mostrarResumo = false; emit('go-to-message', id) }"
    />

    <UserInfoModal
      :aberta="mostrarUsuarioInfo"
      :usuario="usuarioSelecionado"
      :conversa-id="chat.conversaAtivaId"
      @close="fecharUsuarioInfo"
      @open-anexos="(id) => { fecharUsuarioInfo(); emit('open-anexos', id) }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import { useCallStore } from '../stores/call'
import { formatarHora, inicialNome, resumoMensagem } from '../utils/formatters'
import { CodigoPermissao, TipoConteudo, TipoConversa } from '../types/api'
import type { Mensagem, TipoChamada } from '../types/api'
import { resolverUsuarioDaConversa } from '../utils/userProfile'
import type { UsuarioPopup } from '../utils/userProfile'
import UserInfoModal from './UserInfoModal.vue'
import ResumoConversaModal from './ResumoConversaModal.vue'
import { useRecursos } from '../composables/useRecursos'
import IndicadorPresenca from './IndicadorPresenca.vue'
import { usePastasStore } from '../stores/pastas'

const props = withDefaults(defineProps<{
  popout?: boolean
}>(), { popout: false })

const emit = defineEmits<{
  'update:sidebar-aberta': [value: boolean]
  'start-call': [tipo: TipoChamada, comTela?: boolean]
  // Com a conversa: resultado no chat de uma ligação feita nesta conversa
  'go-to-message': [id: number, conversaId?: number]
  'open-group-members': []
  'open-chat-with': [usuarioId: number]
  'open-anexos': [conversaId: number]
}>()

const chat = useChatStore()
const call = useCallStore()
const auth = useAuthStore()
const pastas = usePastasStore()

const isGrupo = computed(() => chat.conversaAtiva?.tipo === TipoConversa.Grupo)
const ocultarAvatar = ref(false)
const { recursos } = useRecursos()
const mostrarResumo = ref(false)
watch(() => chat.conversaAtivaId, () => { mostrarResumo.value = false })
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

// Conversa direta com um bot de IA: a marca ao lado do nome
const conversaComBot = computed(() => !isGrupo.value && !!chat.contatos.find((c) => c.id === destinatarioId.value)?.bot)

const inicialConversa = computed(() => {
  const nome = chat.conversaAtiva?.descricao || chat.conversaAtiva?.nome || `Conversa #${chat.conversaAtiva?.id || ''}`
  return chat.conversaAtiva?.emoji || inicialNome(nome, 'C')
})

const destinatarioId = computed(() => {
  const conv = chat.conversaAtiva
  return conv && !isGrupo.value && conv.destinatario_id ? conv.destinatario_id : null
})

const naConversa = computed(() => destinatarioId.value !== null && chat.estaNaConversa(destinatarioId.value, chat.conversaAtivaId))

// Conversa direta: se a pessoa está com ela aberta, ativa, ausente ou quando foi vista
const textoPresenca = computed(() => {
  if (destinatarioId.value === null) return ''
  const { estado, visto_em } = chat.presencaDe(destinatarioId.value)
  const visto = visto_em ? `visto por último ${formatarVistoEm(visto_em)}` : ''
  if (naConversa.value) return estado === 'ausente' && visto ? `nesta conversa · ${visto}` : 'nesta conversa'
  if (estado === 'ativo') return 'ativo agora'
  if (estado === 'ausente') return visto ? `ausente · ${visto}` : 'ausente'
  return visto
})

function formatarVistoEm(data: Date) {
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dia = new Date(data)
  dia.setHours(0, 0, 0, 0)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.round((hoje.getTime() - dia.getTime()) / 86_400_000)
  if (dias === 0) return `hoje às ${hora}`
  if (dias === 1) return `ontem às ${hora}`
  return `em ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', ...(data.getFullYear() !== hoje.getFullYear() ? { year: 'numeric' } : {}) })} às ${hora}`
}

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

// Termo da última pesquisa feita (o campo pode ter mudado depois)
const termoPesquisado = ref('')
watch(() => chat.conversaAtivaId, () => { termoPesquisado.value = '' })

const ESPACO_ANTES_DO_TERMO = 30

function quandoFoi(data: Date) {
  const hora = formatarHora(data)
  return data.toDateString() === new Date().toDateString()
    ? hora
    : `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', ...(data.getFullYear() !== new Date().getFullYear() ? { year: '2-digit' } : {}) })} ${hora}`
}

// Trecho da mensagem a partir de pouco antes do termo, com o termo destacado
function partesDoTrecho(item: Mensagem, termo: string) {
  const textoBruto = item.conteudos.find((c) => c.tipo === TipoConteudo.Texto)?.conteudo
  const texto = textoBruto ? textoBruto.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1').replace(/\s+/g, ' ').trim() : resumoMensagem(item)
  const alvo = termo.trim().toLowerCase()
  const posicao = alvo ? texto.toLowerCase().indexOf(alvo) : -1
  const inicio = posicao > ESPACO_ANTES_DO_TERMO ? posicao - ESPACO_ANTES_DO_TERMO : 0
  const trecho = (inicio > 0 ? '…' : '') + texto.slice(inicio)
  if (!alvo) return [{ texto: trecho, destaque: false }]
  const partes: { texto: string; destaque: boolean }[] = []
  const minusculo = trecho.toLowerCase()
  let desde = 0
  for (let achou = minusculo.indexOf(alvo); achou >= 0; achou = minusculo.indexOf(alvo, desde)) {
    if (achou > desde) partes.push({ texto: trecho.slice(desde, achou), destaque: false })
    partes.push({ texto: trecho.slice(achou, achou + alvo.length), destaque: true })
    desde = achou + alvo.length
  }
  if (desde < trecho.length) partes.push({ texto: trecho.slice(desde), destaque: false })
  return partes
}

// Do mais antigo ao mais novo, como na conversa
const resultadosBusca = computed(() => {
  const eu = useAuthStore().user?.id
  return [...chat.resultadosBuscaConversa].reverse().map((item) => ({
    id: item.id,
    conversaId: item.conversa_id,
    daLigacao: item.conversa_id !== chat.conversaAtivaId,
    autor: item.remetente_id === eu ? 'Você' : item.remetente,
    quando: quandoFoi(new Date(item.inserida)),
    partes: partesDoTrecho(item, termoPesquisado.value),
  }))
})

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
  const termo = buscaNoChat.value.trim()
  await chat.buscarNaConversa(buscaNoChat.value)
  termoPesquisado.value = termo
}

function limparPesquisa() {
  buscaNoChat.value = ''
  termoPesquisado.value = ''
  chat.resultadosBuscaConversa = []
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
