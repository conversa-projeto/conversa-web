<template>
  <div class="mx-auto mt-10 w-full max-w-xs overflow-hidden rounded-2xl border border-surface-300 bg-surface-base shadow-xl">
    <div class="bg-surface-50 px-6 pt-6 pb-2 text-center">
      <img src="/logo.png" alt="Logo" class="mx-auto h-[200px] w-[200px]" />
      <h1 class="mt-1 text-2xl font-bold text-surface-800">Conversa</h1>
    </div>

    <form class="space-y-3 px-6 py-3" @submit.prevent="fazerLogin">
      <label class="block text-sm font-medium text-surface-700">
        Usu&aacute;rio
        <input
          ref="inputUsuario"
          v-model="login"
          type="text"
          class="mt-1 w-full rounded-xl border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-surface-800"
          autocomplete="username"
          required
        />
      </label>

      <label class="block text-sm font-medium text-surface-700">
        Senha
        <input
          v-model="senha"
          type="password"
          class="mt-1 w-full rounded-xl border border-surface-300 px-3 py-2 bg-surface-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-surface-800"
          autocomplete="current-password"
          required
        />
      </label>

      <p v-if="erro" class="rounded-xl bg-danger-50 dark:bg-danger-900 px-3 py-2 text-sm text-danger-700 dark:text-danger-400">{{ erro }}</p>

      <button
        type="submit"
        :disabled="carregandoLogin"
        class="w-full rounded-xl bg-primary-600 px-3 py-2.5 font-medium text-white hover:bg-primary-700"
      >
        {{ carregandoLogin ? 'Entrando...' : 'Entrar' }}
      </button>

      <p v-if="cadastroAberto" class="text-center text-sm text-surface-500">
        Não tem conta?
        <button type="button" class="font-medium text-primary-600 hover:underline dark:text-primary-400" @click="emit('go-register')">Criar conta</button>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getCadastro } from '../services/conversaApi'

const emit = defineEmits<{
  'login-success': []
  'go-register': []
}>()

const auth = useAuthStore()

const inputUsuario = ref<HTMLInputElement | null>(null)
const login = ref('')
const senha = ref('')
const carregandoLogin = ref(false)
const erro = ref('')
// Fechado pelo administrador, não oferece o cadastro; sem resposta, oferece (o servidor recusa se fechado)
const cadastroAberto = ref(true)

onMounted(() => {
  inputUsuario.value?.focus()
  getCadastro().then((cadastro) => { cadastroAberto.value = cadastro.aberto }).catch(() => {})
})

async function fazerLogin() {
  erro.value = ''
  carregandoLogin.value = true

  try {
    // O App carrega o chat, o ramal e as chamadas quando o login é feito
    await auth.login(login.value.trim(), senha.value)
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
