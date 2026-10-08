<template>
  <aside class="flex h-full w-full flex-col overflow-hidden border-l border-surface-300 bg-surface-base sm:w-80">
    <div class="flex shrink-0 items-center gap-2 border-b border-surface-300 px-4 py-3">
      <h3 class="min-w-0 flex-1 truncate text-base font-semibold text-surface-800">Dados do grupo</h3>
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full text-surface-600 hover:bg-surface-200"
        title="Fechar"
        @click="emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>

    <!-- Nome e participantes -->
    <div class="max-h-[50%] shrink-0 overflow-y-auto border-b border-surface-300 px-4 py-3">
      <div class="flex gap-2">
        <input
          v-model.trim="nomeGrupo"
          type="text"
          aria-label="Nome do grupo"
          class="min-w-0 flex-1 rounded border border-surface-300 bg-surface-100 px-3 py-1.5 text-sm text-surface-800 outline-none focus:border-primary-500"
          placeholder="Nome do grupo"
        />
        <button
          class="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          :disabled="!podeRenomear"
          @click="renomear"
        >
          {{ renomeando ? 'Salvando...' : 'Renomear' }}
        </button>
      </div>

      <div class="mt-3 flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-wide text-surface-500">
          {{ chat.usuariosConversaAtiva.length }} participantes
        </p>
        <button
          type="button"
          class="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-white/10"
          @click="adicionandoPessoas = !adicionandoPessoas; buscaContato = ''"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Adicionar pessoas
        </button>
      </div>

      <!-- Adicionar: busca entre os contatos que ainda não estão no grupo -->
      <div v-if="adicionandoPessoas" class="mt-2 rounded border border-surface-200 bg-surface-50 p-2">
        <input
          ref="campoBusca"
          v-model="buscaContato"
          type="search"
          aria-label="Buscar contato"
          class="w-full rounded border border-surface-300 bg-surface-100 px-2 py-1 text-sm text-surface-800 outline-none focus:border-primary-500"
          placeholder="Buscar contato..."
        />
        <div class="mt-1 max-h-40 overflow-y-auto">
          <button
            v-for="contato in contatosFiltrados"
            :key="`add-${contato.id}`"
            type="button"
            class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-surface-700 hover:bg-surface-200 disabled:opacity-50"
            :disabled="adicionando !== null"
            @click="adicionar(contato.id)"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-xs font-semibold text-surface-700">
              <img v-if="contato.avatar_url" :src="contato.avatar_url" alt="" class="h-full w-full object-cover" />
              <span v-else>{{ inicialNome(contato.nome) }}</span>
            </span>
            <span class="min-w-0 flex-1 truncate">{{ contato.nome }}</span>
            <span v-if="adicionando === contato.id" class="text-xs text-surface-500">Adicionando...</span>
          </button>
          <p v-if="!contatosFiltrados.length" class="px-2 py-2 text-center text-xs text-surface-400">
            {{ contatosDisponiveis.length ? 'Nenhum contato encontrado' : 'Todos os contatos já estão no grupo' }}
          </p>
        </div>
      </div>

      <div class="mt-2">
        <div
          v-for="membro in chat.usuariosConversaAtiva"
          :key="`membro-${membro.usuario_id}`"
          class="group/membro flex items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-surface-100"
        >
          <span class="relative shrink-0">
            <span class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-xs font-semibold text-surface-700">
              <img v-if="membro.avatar_url" :src="membro.avatar_url" alt="" class="h-full w-full object-cover" />
              <span v-else>{{ inicialNome(membro.nome) }}</span>
            </span>
            <span
              v-if="chat.estaOnline(membro.usuario_id)"
              class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success-500 ring-[1.5px] ring-surface-base"
            />
          </span>
          <span class="min-w-0 flex-1 truncate text-surface-700">
            {{ membro.nome }}<span v-if="membro.usuario_id === auth.user?.id" class="text-surface-500"> (você)</span>
          </span>
          <button
            v-if="membro.usuario_id !== auth.user?.id"
            class="rounded px-2 py-0.5 text-xs text-danger-600 opacity-0 hover:bg-danger-50 focus:opacity-100 group-hover/membro:opacity-100 dark:text-danger-400 dark:hover:bg-white/10"
            :disabled="removendo === membro.id"
            @click="remover(membro)"
          >
            {{ removendo === membro.id ? 'Removendo...' : 'Remover' }}
          </button>
        </div>
        <p v-if="!chat.usuariosConversaAtiva.length" class="px-1 py-3 text-center text-sm text-surface-400">
          Nenhum membro
        </p>
      </div>

      <p v-if="erro" class="mt-2 rounded bg-danger-50 px-2 py-1 text-sm text-danger-700 dark:bg-danger-900 dark:text-danger-400">{{ erro }}</p>
      <p v-if="sucesso" class="mt-2 rounded bg-success-50 px-2 py-1 text-sm text-success-700 dark:bg-success-900 dark:text-success-400">{{ sucesso }}</p>
    </div>

    <!-- Anexos do grupo, com os filtros por tipo -->
    <p class="shrink-0 px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-surface-500">Anexos</p>
    <AnexosLista
      v-if="chat.conversaAtivaId"
      :key="chat.conversaAtivaId"
      :conversa-id="chat.conversaAtivaId"
      class="min-h-0 flex-1"
      @open-image-gallery="(item, galeria) => emit('open-image-gallery', item, galeria)"
      @open-message="(conversaId, mensagemId) => emit('open-message', conversaId, mensagemId)"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import type { AnexoItem, Contato } from '../types/api'
import { inicialNome } from '../utils/formatters'
import AnexosLista from './AnexosLista.vue'

// Painel à direita do chat, aberto pelo avatar (ou pelo botão de membros) de
// um grupo: nome, participantes e anexos da conversa
const emit = defineEmits<{
  'close': []
  'open-image-gallery': [item: AnexoItem, galeria: AnexoItem[]]
  'open-message': [conversaId: number, mensagemId: number]
}>()

const chat = useChatStore()
const auth = useAuthStore()

const nomeGrupo = ref('')
const adicionandoPessoas = ref(false)
const buscaContato = ref('')
const campoBusca = ref<HTMLInputElement | null>(null)
const adicionando = ref<number | null>(null)
const renomeando = ref(false)
const removendo = ref<number | null>(null)
const erro = ref('')
const sucesso = ref('')

const contatosDisponiveis = computed(() => {
  const idsAtuais = new Set(chat.usuariosConversaAtiva.map((u: { usuario_id: number }) => u.usuario_id))
  return chat.contatos.filter((c: Contato) => !idsAtuais.has(c.id))
})

const contatosFiltrados = computed(() => {
  const termo = buscaContato.value.trim().toLowerCase()
  return termo ? contatosDisponiveis.value.filter((c) => c.nome.toLowerCase().includes(termo)) : contatosDisponiveis.value
})

const podeRenomear = computed(() => {
  const nomeAtual = (chat.conversaAtiva?.descricao || '').trim()
  const novoNome = nomeGrupo.value.trim()
  return Boolean(chat.conversaAtiva && novoNome && novoNome !== nomeAtual && !renomeando.value)
})

watch(() => chat.conversaAtiva?.id, () => {
  const conversa = chat.conversaAtiva
  nomeGrupo.value = conversa?.descricao || ''
  erro.value = ''
  sucesso.value = ''
  adicionandoPessoas.value = false
  if (conversa) {
    void chat.carregarUsuariosConversa(conversa.id, true)
  }
}, { immediate: true })

watch(adicionandoPessoas, async (aberto) => {
  if (!aberto) return
  await nextTick()
  campoBusca.value?.focus()
})

async function renomear() {
  if (!chat.conversaAtiva || !podeRenomear.value) return
  erro.value = ''
  sucesso.value = ''
  renomeando.value = true
  try {
    await chat.renomearGrupo(chat.conversaAtiva.id, nomeGrupo.value.trim())
    nomeGrupo.value = chat.conversaAtiva?.descricao || nomeGrupo.value.trim()
    sucesso.value = 'Grupo renomeado com sucesso.'
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao renomear o grupo'
  } finally {
    renomeando.value = false
  }
}

async function adicionar(usuarioId: number) {
  if (!chat.conversaAtiva) return
  erro.value = ''
  sucesso.value = ''
  adicionando.value = usuarioId
  try {
    await chat.adicionarMembroGrupo(chat.conversaAtiva.id, usuarioId)
    buscaContato.value = ''
    sucesso.value = 'Participante adicionado com sucesso.'
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao adicionar'
  } finally {
    adicionando.value = null
  }
}

async function remover(membro: { id: number; usuario_id: number; nome: string }) {
  if (!chat.conversaAtiva) return
  erro.value = ''
  sucesso.value = ''
  removendo.value = membro.id
  try {
    await chat.removerMembroGrupo(chat.conversaAtiva.id, membro.id)
    sucesso.value = 'Participante removido com sucesso.'
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao remover'
  } finally {
    removendo.value = null
  }
}
</script>
