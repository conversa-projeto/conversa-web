<template>
  <div class="mx-auto mt-10 w-full max-w-md overflow-hidden rounded-2xl border border-surface-200 bg-surface-base shadow-xl">
    <div class="bg-surface-900/80 px-6 py-8 text-center">
      <img src="/logo.png" alt="Logo" class="mx-auto h-[200px] w-[200px]" />
      <h1 class="mt-4 text-2xl font-bold text-white">Conversa</h1>
      <p class="mt-1 text-sm text-surface-300">Crie sua conta</p>
    </div>

    <form class="space-y-4 px-6 py-6" @submit.prevent="cadastrar">
      <label class="block text-sm font-medium text-surface-700">
        Nome
        <input
          v-model="nome"
          type="text"
          class="mt-1 w-full rounded-xl border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-surface-800"
          required
        />
      </label>

      <label class="block text-sm font-medium text-surface-700">
        Usuário
        <input
          v-model="login"
          type="text"
          class="mt-1 w-full rounded-xl border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-surface-800"
          autocomplete="username"
          required
        />
      </label>

      <label class="block text-sm font-medium text-surface-700">
        E-mail
        <input
          v-model="email"
          type="email"
          class="mt-1 w-full rounded-xl border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-surface-800"
          autocomplete="email"
          required
        />
      </label>

      <label class="block text-sm font-medium text-surface-700">
        Senha
        <input
          v-model="senha"
          type="password"
          class="mt-1 w-full rounded-xl border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-surface-800"
          autocomplete="new-password"
          minlength="4"
          required
        />
      </label>

      <p v-if="erro" class="rounded-xl bg-danger-50 dark:bg-danger-900 px-3 py-2 text-sm text-danger-700 dark:text-danger-400">{{ erro }}</p>
      <p v-if="sucesso" class="rounded-xl bg-success-50 dark:bg-success-900 px-3 py-2 text-sm text-success-700 dark:text-success-400">{{ sucesso }}</p>

      <button
        type="submit"
        :disabled="carregando"
        class="w-full rounded-xl bg-primary-600 px-3 py-2.5 font-medium text-white hover:bg-primary-700"
      >
        {{ carregando ? 'Cadastrando...' : 'Cadastrar' }}
      </button>

      <p class="text-center text-sm text-surface-500">
        Já tem conta?
        <button type="button" class="font-medium text-primary-600 hover:underline" @click="emit('go-login')">Entrar</button>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as api from '../services/conversaApi'

const emit = defineEmits<{
  'go-login': []
}>()

const nome = ref('')
const login = ref('')
const email = ref('')
const senha = ref('')
const carregando = ref(false)
const erro = ref('')
const sucesso = ref('')

async function cadastrar() {
  erro.value = ''
  sucesso.value = ''
  carregando.value = true

  try {
    await api.cadastrar(nome.value.trim(), login.value.trim(), email.value.trim(), senha.value)
    sucesso.value = 'Conta criada com sucesso!'
    setTimeout(() => emit('go-login'), 1500)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao cadastrar'
  } finally {
    carregando.value = false
  }
}
</script>
