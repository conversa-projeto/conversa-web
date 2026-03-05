<template>
  <div v-if="aberta" class="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4">
    <div class="w-full max-w-md rounded-xl bg-white p-4">
      <h3 class="mb-3 text-lg font-semibold text-slate-800">Criar grupo</h3>

      <label class="mb-3 block text-sm text-slate-700">
        Nome do grupo
        <input
          v-model="nomeGrupo"
          type="text"
          class="mt-1 w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          placeholder="Ex: Projeto Alpha"
        />
      </label>

      <p class="mb-2 text-sm font-medium text-slate-700">Selecionar usu&aacute;rios</p>
      <div class="max-h-52 overflow-auto rounded border border-slate-200">
        <label
          v-for="contato in chat.contatos"
          :key="`group-${contato.id}`"
          class="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
        >
          <input v-model="membrosGrupo" type="checkbox" :value="contato.id" />
          <span>{{ contato.nome }}</span>
        </label>
      </div>

      <p v-if="erroGrupo" class="mt-2 rounded bg-rose-50 px-2 py-1 text-sm text-rose-700">{{ erroGrupo }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" @click="cancelar">Cancelar</button>
        <button class="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700" @click="confirmar">Criar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '../stores/chat'

defineProps<{
  aberta: boolean
}>()

const emit = defineEmits<{
  'close': []
  'created': []
}>()

const chat = useChatStore()

const nomeGrupo = ref('')
const membrosGrupo = ref<number[]>([])
const erroGrupo = ref('')

function cancelar() {
  nomeGrupo.value = ''
  membrosGrupo.value = []
  erroGrupo.value = ''
  emit('close')
}

async function confirmar() {
  erroGrupo.value = ''

  if (!nomeGrupo.value.trim()) {
    erroGrupo.value = 'Informe o nome do grupo.'
    return
  }

  if (membrosGrupo.value.length === 0) {
    erroGrupo.value = 'Selecione ao menos um usu\u00E1rio.'
    return
  }

  try {
    await chat.criarGrupo(nomeGrupo.value.trim(), membrosGrupo.value)
    nomeGrupo.value = ''
    membrosGrupo.value = []
    erroGrupo.value = ''
    emit('close')
    emit('created')
  } catch (e) {
    erroGrupo.value = e instanceof Error ? e.message : 'Erro ao criar grupo'
  }
}
</script>
