<template>
  <div v-if="aberta" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" >
    <div class="w-full max-w-md rounded-xl bg-white p-4 shadow-2xl">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-800">Configuracoes</h2>
        <button class="rounded px-2 py-1 text-slate-500 hover:bg-slate-100" @click="fechar">&times;</button>
      </div>

      <div class="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
        <p class="text-sm font-medium text-slate-700">Foto de perfil</p>
        <p class="mt-1 text-xs text-slate-500">Em breve voce podera alterar a imagem de perfil.</p>
      </div>

      <form class="space-y-3" @submit.prevent="salvarSenha">
        <div>
          <label class="mb-1 block text-sm text-slate-700">Senha atual</label>
          <input v-model="senhaAtual" type="password" class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div>
          <label class="mb-1 block text-sm text-slate-700">Nova senha</label>
          <input v-model="senhaNova" type="password" class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div>
          <label class="mb-1 block text-sm text-slate-700">Confirmar nova senha</label>
          <input v-model="confirmacaoSenha" type="password" class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <p v-if="erro" class="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{{ erro }}</p>
        <p v-if="sucesso" class="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{{ sucesso }}</p>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" @click="fechar">Cancelar</button>
          <button type="submit" class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" :disabled="salvando">
            {{ salvando ? 'Salvando...' : 'Salvar senha' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import * as api from '../services/conversaApi'

const props = defineProps<{
  aberta: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const senhaAtual = ref('')
const senhaNova = ref('')
const confirmacaoSenha = ref('')
const erro = ref('')
const sucesso = ref('')
const salvando = ref(false)

watch(() => props.aberta, (aberta) => {
  if (!aberta) return
  senhaAtual.value = ''
  senhaNova.value = ''
  confirmacaoSenha.value = ''
  erro.value = ''
  sucesso.value = ''
})

function fechar() {
  emit('close')
}

async function salvarSenha() {
  erro.value = ''
  sucesso.value = ''

  if (!senhaAtual.value || !senhaNova.value || !confirmacaoSenha.value) {
    erro.value = 'Preencha todos os campos de senha.'
    return
  }

  if (senhaNova.value.length < 6) {
    erro.value = 'A nova senha deve ter pelo menos 6 caracteres.'
    return
  }

  if (senhaNova.value !== confirmacaoSenha.value) {
    erro.value = 'A confirmacao da senha nao confere.'
    return
  }

  salvando.value = true
  try {
    await api.alterarSenha(senhaAtual.value, senhaNova.value)
    sucesso.value = 'Senha alterada com sucesso.'
    senhaAtual.value = ''
    senhaNova.value = ''
    confirmacaoSenha.value = ''
    fechar()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Nao foi possivel alterar a senha.'
  } finally {
    salvando.value = false
  }
}
</script>


