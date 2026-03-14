<template>
  <div class="mx-auto mt-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
    <div class="bg-slate-900/80 px-6 py-8 text-center">
      <img src="/logo.png" alt="Logo" class="mx-auto h-[200px] w-[200px]" />
      <h1 class="mt-4 text-2xl font-bold text-white">Conversa</h1>
      <p class="mt-1 text-sm text-slate-300">Entre com seu usu&aacute;rio e senha</p>
    </div>

    <form class="space-y-4 px-6 py-6" @submit.prevent="fazerLogin">
      <label class="block text-sm font-medium text-slate-700">
        Usu&aacute;rio
        <input
          v-model="login"
          type="text"
          class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          autocomplete="username"
          required
        />
      </label>

      <label class="block text-sm font-medium text-slate-700">
        Senha
        <input
          v-model="senha"
          type="password"
          class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          autocomplete="current-password"
          required
        />
      </label>

      <p v-if="erro" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ erro }}</p>

      <button
        type="submit"
        :disabled="carregandoLogin"
        class="w-full rounded-xl bg-blue-600 px-3 py-2.5 font-medium text-white hover:bg-blue-700"
      >
        {{ carregandoLogin ? 'Entrando...' : 'Entrar' }}
      </button>

      <p class="text-center text-sm text-slate-500">
        Não tem conta?
        <button type="button" class="font-medium text-blue-600 hover:underline" @click="emit('go-register')">Criar conta</button>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useCallStore } from '../stores/call'

const emit = defineEmits<{
  'login-success': []
  'go-register': []
}>()

const auth = useAuthStore()
const chat = useChatStore()
const call = useCallStore()

const login = ref('')
const senha = ref('')
const carregandoLogin = ref(false)
const erro = ref('')

async function fazerLogin() {
  erro.value = ''
  carregandoLogin.value = true

  try {
    await auth.login(login.value.trim(), senha.value)
    await chat.inicializar()
    chat.registrarHandlerChamada((evento) => {
      void call.tratarEventoChamada(evento)
    })
    void call.verificarChamadasPendentes()
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    emit('login-success')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Erro ao efetuar login'
  } finally {
    carregandoLogin.value = false
  }
}
</script>
