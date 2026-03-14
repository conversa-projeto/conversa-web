<template>
  <div class="mx-auto mt-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
    <div class="bg-slate-900/80 px-6 py-8 text-center">
      <img src="/logo.png" alt="Logo" class="mx-auto h-[200px] w-[200px]" />
      <h1 class="mt-4 text-2xl font-bold text-white">Conversa</h1>
      <p class="mt-1 text-sm text-slate-300">Crie sua conta</p>
    </div>

    <form class="space-y-4 px-6 py-6" @submit.prevent="cadastrar">
      <label class="block text-sm font-medium text-slate-700">
        Nome
        <input
          v-model="nome"
          type="text"
          class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          required
        />
      </label>

      <label class="block text-sm font-medium text-slate-700">
        Usuário
        <input
          v-model="login"
          type="text"
          class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          autocomplete="username"
          required
        />
      </label>

      <label class="block text-sm font-medium text-slate-700">
        E-mail
        <input
          v-model="email"
          type="email"
          class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          autocomplete="email"
          required
        />
      </label>

      <label class="block text-sm font-medium text-slate-700">
        Senha
        <input
          v-model="senha"
          type="password"
          class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          autocomplete="new-password"
          minlength="4"
          required
        />
      </label>

      <p v-if="erro" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</p>
      <p v-if="sucesso" class="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ sucesso }}</p>

      <button
        type="submit"
        :disabled="carregando"
        class="w-full rounded-xl bg-blue-600 px-3 py-2.5 font-medium text-white hover:bg-blue-700"
      >
        {{ carregando ? 'Cadastrando...' : 'Cadastrar' }}
      </button>

      <p class="text-center text-sm text-slate-500">
        Já tem conta?
        <button type="button" class="font-medium text-blue-600 hover:underline" @click="emit('go-login')">Entrar</button>
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
