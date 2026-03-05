<template>
  <div v-if="aberta" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <div class="w-full max-w-md rounded-xl bg-white p-4">
      <h3 class="mb-3 text-lg font-semibold text-slate-800">Adicionar &agrave; chamada</h3>

      <div v-if="call.contatosNaoNaChamada.length === 0" class="py-4 text-center text-sm text-slate-500">
        Nenhum contato dispon&iacute;vel para adicionar.
      </div>
      <div v-else class="max-h-52 overflow-auto rounded border border-slate-200">
        <label
          v-for="contato in call.contatosNaoNaChamada"
          :key="`add-${contato.id}`"
          class="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
        >
          <input v-model="usuariosParaAdicionar" type="checkbox" :value="contato.id" />
          <span>{{ contato.nome }}</span>
        </label>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" @click="cancelar">Cancelar</button>
        <button
          class="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          :disabled="usuariosParaAdicionar.length === 0"
          @click="confirmar"
        >
          Adicionar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCallStore } from '../stores/call'

defineProps<{
  aberta: boolean
}>()

const emit = defineEmits<{
  'close': []
}>()

const call = useCallStore()
const usuariosParaAdicionar = ref<number[]>([])

function cancelar() {
  usuariosParaAdicionar.value = []
  emit('close')
}

async function confirmar() {
  if (usuariosParaAdicionar.value.length === 0) return

  try {
    for (const id of usuariosParaAdicionar.value) {
      await call.adicionarUsuario(id)
    }
  } finally {
    usuariosParaAdicionar.value = []
    emit('close')
  }
}
</script>
