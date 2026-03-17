<template>
  <div v-if="aberta" class="fixed inset-0 z-20 flex items-center justify-center bg-surface-900/50 p-4">
    <div class="w-full max-w-md rounded-xl bg-surface-base p-4">
      <h3 class="mb-3 text-lg font-semibold text-surface-800">Criar grupo</h3>

      <label class="mb-3 block text-sm text-surface-700">
        Nome do grupo
        <input
          v-model="nomeGrupo"
          type="text"
          class="mt-1 w-full rounded border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 text-surface-800"
          placeholder="Ex: Projeto Alpha"
        />
      </label>

      <p class="mb-2 text-sm font-medium text-surface-700">Selecionar usu&aacute;rios</p>
      <div class="max-h-52 overflow-auto rounded border border-surface-200">
        <label
          v-for="contato in chat.contatos"
          :key="`group-${contato.id}`"
          class="flex cursor-pointer items-center gap-2 border-b border-surface-100 px-3 py-2 text-sm hover:bg-surface-50"
        >
          <input v-model="membrosGrupo" type="checkbox" :value="contato.id" />
          <span>{{ contato.nome }}</span>
        </label>
      </div>

      <p v-if="erroGrupo" class="mt-2 rounded bg-danger-50 dark:bg-danger-900 px-2 py-1 text-sm text-danger-700 dark:text-danger-400">{{ erroGrupo }}</p>

      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded border border-surface-300 px-3 py-2 text-sm hover:bg-surface-100" @click="cancelar">Cancelar</button>
        <button class="rounded bg-success-600 px-3 py-2 text-sm font-medium text-white hover:bg-success-700" @click="confirmar">Criar</button>
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
