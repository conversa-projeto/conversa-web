import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/conversaApi'
import type { LoginResponse, Usuario } from '../types/api'

const TOKEN_KEY = 'conversa.token'
const USER_KEY = 'conversa.user'
const API_BASE_KEY = 'conversa.apiBase'
const DEVICE_KEY = 'conversa.deviceId'

function parseStoredUser(): Usuario | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as Usuario
  } catch {
    return null
  }
}

function getDefaultApiBase(): string {
  const stored = localStorage.getItem(API_BASE_KEY)
  const fallback =
    import.meta.env.VITE_API_BASE ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:90`
      : 'http://localhost:90')

  let base = stored || fallback
  if (typeof window !== 'undefined') {
    const hostAtual = window.location.hostname
    base = base.replace('://localhost:', `://${hostAtual}:`)
    base = base.replace('://127.0.0.1:', `://${hostAtual}:`)
  }
  if (base.endsWith(':9000')) {
    base = base.replace(':9000', ':90')
  }
  return base
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref<Usuario | null>(parseStoredUser())
  const dispositivoId = ref<number | null>(Number(localStorage.getItem(DEVICE_KEY) || 0) || null)
  const apiBase = ref(getDefaultApiBase())

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setApiBase(base: string) {
    apiBase.value = base.trim().replace(/\/$/, '')
    localStorage.setItem(API_BASE_KEY, apiBase.value)
  }

  async function login(loginValue: string, senha: string): Promise<LoginResponse> {
    const response = await api.login(loginValue, senha, dispositivoId.value || undefined)

    token.value = response.token
    user.value = {
      id: response.id,
      nome: response.nome,
      login: response.login,
      email: response.email,
      telefone: response.telefone
    }
    dispositivoId.value = response.dispositivo?.id || null

    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    if (dispositivoId.value) {
      localStorage.setItem(DEVICE_KEY, String(dispositivoId.value))
    }

    return response
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return {
    token,
    user,
    apiBase,
    dispositivoId,
    isAuthenticated,
    setApiBase,
    login,
    logout
  }
})
