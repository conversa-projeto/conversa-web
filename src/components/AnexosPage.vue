<template>
  <div class="flex h-full flex-col overflow-hidden bg-surface-base">
    <!-- Header -->
    <div class="shrink-0 border-b border-surface-300 px-4 py-3">
      <h2 class="text-lg font-semibold text-surface-800">Anexos</h2>

      <!-- Chip da conversa selecionada -->
      <div v-if="conversaSelecionada" class="mt-2 flex items-center gap-2 rounded-full border border-surface-300 bg-surface-100 px-3 py-1 text-sm text-surface-700 w-fit">
        <div class="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-surface-400 text-[10px] font-semibold text-surface-700">
          <img v-if="avatarConversa(conversaSelecionada)" :src="avatarConversa(conversaSelecionada)" alt="" class="h-full w-full object-cover" />
          <span v-else>{{ inicialConversa(conversaSelecionada) }}</span>
        </div>
        <span class="truncate max-w-[200px]">{{ tituloConversa(conversaSelecionada) }}</span>
        <button
          type="button"
          class="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-300 hover:text-surface-700"
          title="Limpar selecao"
          @click="limparSelecao"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-3 w-3">
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        </button>
      </div>

      <!-- Campo de busca (modo busca) -->
      <div v-else class="mt-2 flex items-center rounded-full border border-surface-300 bg-surface-100 pr-1 focus-within:border-primary-500">
        <input
          v-model="filtro"
          type="text"
          class="min-w-0 flex-1 bg-transparent pl-4 pr-1 py-1.5 text-sm text-surface-800 outline-none"
          placeholder="Buscar contato ou grupo..."
        />
      </div>
    </div>

    <!-- Corpo -->
    <div v-if="!conversaSelecionada" class="flex-1 overflow-y-auto">
      <!-- Estado inicial sem busca -->
      <div v-if="!filtro.trim()" class="flex h-full items-center justify-center px-6 text-center">
        <span class="text-sm text-surface-500">Selecione um contato ou grupo para ver os anexos</span>
      </div>

      <!-- Resultados -->
      <div v-else>
        <div v-if="conversasFiltradas.length === 0" class="flex items-center justify-center py-10">
          <span class="text-sm text-surface-500">Nenhum resultado</span>
        </div>

        <button
          v-for="conversa in conversasFiltradas"
          :key="conversa.id"
          type="button"
          class="flex w-full items-center gap-3 border-b border-surface-200 px-4 py-2.5 text-left transition hover:bg-surface-100"
          @click="selecionarConversa(conversa.id)"
        >
          <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-300 text-sm font-semibold text-surface-700">
            <img v-if="avatarConversa(conversa)" :src="avatarConversa(conversa)" alt="" class="h-full w-full object-cover" />
            <span v-else>{{ inicialConversa(conversa) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-sm font-medium text-surface-800">
              <span class="truncate">{{ tituloConversa(conversa) }}</span>
              <span
                v-if="conversa.tipo === TipoConversa.Grupo"
                class="shrink-0 rounded-full bg-primary-100 dark:bg-primary-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300"
              >Grupo</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-surface-500">{{ conversa.ultima_mensagem_texto || 'Sem mensagens' }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Lista de anexos -->
    <AnexosLista
      v-else
      :conversa-id="conversaSelecionada.id"
      class="flex-1"
      @open-image-gallery="(item, galeria) => emit('open-image-gallery', item, galeria)"
      @open-message="(cId, mId) => emit('open-message', cId, mId)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import type { AnexoItem, Conversa } from '../types/api'
import { TipoConversa } from '../types/api'
import AnexosLista from './AnexosLista.vue'

const props = defineProps<{
  /** ID da conversa pre-selecionada (ex: deep link ou vindo do UserInfoModal) */
  conversaIdInicial?: number | null
}>()

const emit = defineEmits<{
  'open-image-gallery': [item: AnexoItem, galeria: AnexoItem[]]
  'open-message': [conversaId: number, mensagemId: number]
  'update:conversa-id': [conversaId: number | null]
}>()

const chat = useChatStore()

const filtro = ref('')
const conversaSelecionadaId = ref<number | null>(props.conversaIdInicial ?? null)

const conversaSelecionada = computed<Conversa | null>(() => {
  if (!conversaSelecionadaId.value) return null
  return chat.conversas.find((c: Conversa) => c.id === conversaSelecionadaId.value) || null
})

const conversasFiltradas = computed<Conversa[]>(() => {
  const termo = filtro.value.trim().toLowerCase()
  if (!termo) return []
  return chat.conversas
    .filter((c: Conversa) => {
      const titulo = (c.descricao || c.nome || '').toLowerCase()
      return titulo.includes(termo)
    })
    .sort((a, b) => (b.mensagem_id ?? 0) - (a.mensagem_id ?? 0))
})

function selecionarConversa(conversaId: number) {
  conversaSelecionadaId.value = conversaId
  filtro.value = ''
  emit('update:conversa-id', conversaId)
}

function limparSelecao() {
  conversaSelecionadaId.value = null
  emit('update:conversa-id', null)
}

function tituloConversa(conversa: Conversa): string {
  return conversa.descricao || conversa.nome || `Conversa #${conversa.id}`
}

function inicialConversa(conversa: Conversa): string {
  const nome = tituloConversa(conversa).trim()
  return (nome.charAt(0) || 'C').toUpperCase()
}

function avatarConversa(conversa: Conversa): string {
  return conversa.avatar_url || ''
}

// Quando o pai muda o conversaIdInicial (ex: novo clique em "Ver anexos" do modal),
// sincronizar o estado local.
watch(() => props.conversaIdInicial, (novo) => {
  conversaSelecionadaId.value = novo ?? null
})
</script>
