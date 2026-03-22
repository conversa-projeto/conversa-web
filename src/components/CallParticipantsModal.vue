<template>
  <div v-if="aberta" class="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-md rounded-xl bg-surface-base p-4">
      <h3 class="mb-3 text-lg font-semibold text-surface-800">
        {{ tipoChamada === 2 ? 'Chamada de v\u00EDdeo' : 'Chamada de voz' }}
      </h3>

      <p class="mb-2 text-sm font-medium text-surface-700">Selecionar participantes</p>
      <div class="max-h-52 overflow-auto rounded border border-surface-200">
        <label
          v-for="contato in chat.contatos"
          :key="`call-${contato.id}`"
          class="flex cursor-pointer items-center gap-2 border-b border-surface-100 px-3 py-2 text-sm hover:bg-surface-50"
        >
          <input v-model="participantesSelecionados" type="checkbox" :value="contato.id" />
          <span>{{ contato.nome }}</span>
        </label>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded border border-surface-300 px-3 py-2 text-sm hover:bg-surface-100" @click="cancelar">Cancelar</button>
        <button
          class="rounded bg-success-600 px-3 py-2 text-sm font-medium text-white hover:bg-success-700"
          :disabled="participantesSelecionados.length === 0"
          @click="confirmar"
        >
          Iniciar chamada
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '../stores/chat'
import type { TipoChamada } from '../types/api'

defineProps<{
  aberta: boolean
  tipoChamada: TipoChamada
}>()

const emit = defineEmits<{
  'close': []
  'confirm': [participantes: number[]]
}>()

const chat = useChatStore()
const participantesSelecionados = ref<number[]>([])

function cancelar() {
  participantesSelecionados.value = []
  emit('close')
}

function confirmar() {
  const selecionados = [...participantesSelecionados.value]
  participantesSelecionados.value = []
  emit('confirm', selecionados)
}
</script>
