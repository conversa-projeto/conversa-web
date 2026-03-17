<template>
  <div v-if="aberta && mensagem" class="fixed inset-0 z-30 flex items-center justify-center bg-surface-900/50 p-4">
    <div class="w-full max-w-lg rounded-2xl bg-surface-base p-4 shadow-2xl">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="select-none text-lg font-semibold text-surface-800">Encaminhar mensagem</h3>
          <p class="select-none text-sm text-surface-500">Escolha uma conversa ou contato para receber esta mensagem.</p>
        </div>
        <button class="h-10 w-10 shrink-0 rounded-full text-surface-400 transition hover:bg-surface-100 hover:text-surface-600" @click="emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="mx-auto h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div class="mb-4 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2">
        <span class="block select-none text-xs font-semibold text-primary-600">Mensagem selecionada</span>
        <p class="mt-1 truncate text-sm text-surface-700">{{ resumoMensagem(mensagem) }}</p>
      </div>

      <label class="mb-3 block text-sm text-surface-700">
        Buscar destino
        <input
          v-model="busca"
          type="text"
          class="mt-1 w-full rounded-lg border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 text-surface-800"
          placeholder="Nome da conversa ou contato"
        />
      </label>

      <div class="max-h-[360px] overflow-y-auto rounded-xl border border-surface-200">
        <div v-if="destinosFiltrados.length === 0" class="px-4 py-6 text-center text-sm text-surface-500">
          Nenhum destino encontrado.
        </div>

        <button
          v-for="destino in destinosFiltrados"
          :key="destino.key"
          class="flex w-full items-center justify-between gap-3 border-b border-surface-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-50"
          @click="selecionarDestino(destino)"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-surface-800">{{ destino.titulo }}</p>
            <p class="truncate text-xs text-surface-500">{{ destino.descricao }}</p>
          </div>
          <span
            class="rounded-full px-2 py-1 text-[11px] font-semibold"
            :class="destino.kind === 'conversa' ? 'bg-primary-100 text-primary-700' : 'bg-success-100 text-success-700 dark:text-success-400'"
          >
            {{ destino.kind === 'conversa' ? 'Conversa' : 'Contato' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { TipoConversa } from '../types/api'
import type { Contato, Mensagem } from '../types/api'
import { resumoMensagem } from '../utils/formatters'

const props = defineProps<{
  aberta: boolean
  mensagem: Mensagem | null
}>()

const emit = defineEmits<{
  'close': []
  'select-conversation': [conversaId: number]
  'select-contact': [contato: Contato]
}>()

const chat = useChatStore()
const busca = ref('')

type DestinoLista = {
  key: string
  kind: 'conversa' | 'contato'
  titulo: string
  descricao: string
  conversaId?: number
  contato?: Contato
}

watch(() => props.aberta, (aberta) => {
  if (!aberta) busca.value = ''
})

const contatosComConversaDireta = computed(() => {
  const mapa = new Set<number>()
  for (const conversa of chat.conversas) {
    if (conversa.tipo === TipoConversa.Direta && conversa.destinatario_id) {
      mapa.add(conversa.destinatario_id)
    }
  }
  return mapa
})

const destinosFiltrados = computed<DestinoLista[]>(() => {
  const termo = busca.value.trim().toLowerCase()
  const destinos: DestinoLista[] = []

  for (const conversa of chat.conversas) {
    if (conversa.id === props.mensagem?.conversa_id) continue

    const titulo = conversa.tipo === TipoConversa.Grupo
      ? (conversa.descricao || 'Grupo sem nome')
      : (conversa.nome || conversa.descricao || 'Conversa direta')

    destinos.push({
      key: `conversa-${conversa.id}`,
      kind: 'conversa',
      titulo,
      descricao: conversa.tipo === TipoConversa.Grupo ? 'Grupo existente' : 'Conversa direta existente',
      conversaId: conversa.id
    })
  }

  for (const contato of chat.contatos) {
    if (contatosComConversaDireta.value.has(contato.id)) continue

    destinos.push({
      key: `contato-${contato.id}`,
      kind: 'contato',
      titulo: contato.nome,
      descricao: contato.email || 'Novo chat direto',
      contato
    })
  }

  return destinos.filter((destino) => {
    if (!termo) return true
    return `${destino.titulo} ${destino.descricao}`.toLowerCase().includes(termo)
  })
})

function selecionarDestino(destino: DestinoLista) {
  if (destino.kind === 'conversa' && destino.conversaId) {
    emit('select-conversation', destino.conversaId)
    return
  }

  if (destino.kind === 'contato' && destino.contato) {
    emit('select-contact', destino.contato)
  }
}
</script>
