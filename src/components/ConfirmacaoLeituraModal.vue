<template>
  <div
    v-if="aberta"
    class="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 py-6"
    data-escolher-confirmacao
    @click.self="emit('close')"
  >
    <div class="flex max-h-full w-full max-w-sm flex-col rounded-2xl bg-surface-base p-5 shadow-2xl">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-surface-900">Quem precisa confirmar</h2>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full text-surface-400 transition hover:bg-surface-100 hover:text-surface-700"
          title="Fechar"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Filtro pelo nome, sem acento; "Todos" continua valendo para todos -->
      <input
        v-model="filtro"
        type="search"
        placeholder="Filtrar por nome"
        aria-label="Filtrar participantes por nome"
        class="mb-2 w-full rounded-lg border border-surface-300 bg-surface-100 px-3 py-1.5 text-sm text-surface-800 outline-none placeholder:text-surface-500 focus:border-primary-500"
      />

      <label class="flex cursor-pointer items-center gap-2 border-b border-surface-200 pb-2 text-sm font-medium text-surface-800">
        <input type="checkbox" class="h-4 w-4 accent-primary-600 dark:accent-primary-500" :checked="todos" @change="alternarTodos" />
        Todos ({{ membros.length }})
      </label>

      <div class="min-h-0 flex-1 overflow-y-auto py-1">
        <p v-if="!membros.length" class="py-3 text-center text-sm text-surface-500">Carregando participantes</p>
        <p v-else-if="!filtrados.length" class="py-3 text-center text-sm text-surface-500">Ninguém com “{{ filtro.trim() }}”</p>
        <label
          v-for="membro in filtrados"
          :key="membro.usuario_id"
          class="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-surface-700 hover:bg-surface-100"
        >
          <input v-model="escolhidos" type="checkbox" class="h-4 w-4 accent-primary-600 dark:accent-primary-500" :value="membro.usuario_id" />
          <span class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
            <img v-if="membro.avatar_url" :src="membro.avatar_url" alt="" class="h-full w-full object-cover" />
            <span v-else>{{ inicialNome(membro.nome) }}</span>
          </span>
          <span class="truncate">{{ membro.nome }}</span>
        </label>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm text-surface-600 transition hover:bg-surface-100"
          @click="emit('close')"
        >Cancelar</button>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!escolhidos.length"
          @click="confirmar"
        >{{ textoConfirmar ?? 'Pedir confirmação' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { inicialNome } from '../utils/formatters'
import { semAcento } from '../composables/useEmojis'

// Escolha de quem precisa confirmar a leitura (em grupo). Devolve null quando
// são todos: assim quem entrar no grupo antes do envio também entra na lista.
const props = defineProps<{
  aberta: boolean
  conversaId: number
  // Escolha anterior (null: todos)
  inicial?: number[] | null
  textoConfirmar?: string
}>()

const emit = defineEmits<{
  close: []
  escolher: [usuarios: number[] | null]
}>()

const chat = useChatStore()
const meuId = computed(() => useAuthStore().user?.id)
const membros = computed(() => (chat.usuariosConversa[props.conversaId] ?? []).filter((m) => m.usuario_id !== meuId.value))
const escolhidos = ref<number[]>([])
const filtro = ref('')
const filtrados = computed(() => {
  const termo = semAcento(filtro.value.trim())
  return termo ? membros.value.filter((m) => semAcento(m.nome).includes(termo)) : membros.value
})
const todos = computed(() => membros.value.length > 0 && membros.value.every((m) => escolhidos.value.includes(m.usuario_id)))

function alternarTodos() {
  escolhidos.value = todos.value ? [] : membros.value.map((m) => m.usuario_id)
}

watch(() => props.aberta, async (aberta) => {
  if (!aberta) return
  filtro.value = ''
  escolhidos.value = props.inicial ? [...props.inicial] : []
  await chat.carregarUsuariosConversa(props.conversaId)
  if (!props.inicial) escolhidos.value = membros.value.map((m) => m.usuario_id)
}, { immediate: true })

function confirmar() {
  emit('escolher', todos.value ? null : [...escolhidos.value])
}
</script>
