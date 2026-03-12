import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/conversaApi'
import { getApiBase, setApiBase as setApiBaseHttp } from '../services/http'
import type { Usuario } from '../types/api'

const TOKEN_KEY = 'conversa.token'
const USER_KEY = 'conversa.user'
const DEVICE_KEY = 'conversa.deviceId'

function parseStoredUser(): Usuario | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Usuario>
    const id = Number(parsed.id)
    if (!Number.isFinite(id) || id <= 0) {
      return null
    }
    return {
      id,
      nome: String(parsed.nome || ''),
      login: String(parsed.login || ''),
      email: String(parsed.email || ''),
      telefone: parsed.telefone ?? null,
      avatar_url: parsed.avatar_url ?? null,
      avatar_identificador: (parsed.avatar_identificador as string) ?? null,
    }
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref<Usuario | null>(parseStoredUser())
  const dispositivoId = ref<number | null>((() => {
    const stored = localStorage.getItem(DEVICE_KEY)
    if (!stored) return null
    const num = Number(stored)
    return Number.isFinite(num) && num > 0 ? num : null
  })())
  const apiBase = ref(getApiBase())

  // Avatar URL resolvida (presigned, pode expirar — por isso resolvemos sob demanda)
  const avatarUrl = ref('')
  let avatarCarregando = false

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setApiBase(base: string) {
    const normalizado = base.trim().replace(/\/$/, '')
    apiBase.value = normalizado
    setApiBaseHttp(normalizado)
  }

  function persistirUser() {
    if (user.value) {
      localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    }
  }

  async function resolverAvatarUrl() {
    const identificador = user.value?.avatar_identificador
    if (!identificador || avatarCarregando) return
    avatarCarregando = true
    try {
      const url = await api.getAnexoUrl(identificador)
      avatarUrl.value = url
    } catch {
      avatarUrl.value = ''
    } finally {
      avatarCarregando = false
    }
  }

  async function login(loginValue: string, senha: string) {
    const response = await api.login(loginValue, senha, dispositivoId.value || undefined)

    if (!response.token) {
      throw new Error('Resposta de login inválida: token ausente')
    }

    token.value = response.token
    user.value = {
      id: Number(response.id),
      nome: response.nome,
      login: response.login,
      email: response.email,
      telefone: response.telefone,
      avatar_url: response.avatar_url ?? null,
      avatar_identificador: response.avatar_identificador ?? null,
    }
    dispositivoId.value = response.dispositivo?.id || null

    localStorage.setItem(TOKEN_KEY, token.value)
    persistirUser()
    if (dispositivoId.value) {
      localStorage.setItem(DEVICE_KEY, String(dispositivoId.value))
    }

    // Resolver avatar URL fresca
    if (user.value.avatar_identificador) {
      void resolverAvatarUrl()
    }

    return response
  }

  function logout() {
    token.value = ''
    user.value = null
    avatarUrl.value = ''
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function atualizarAvatar(identificador: string, url: string) {
    if (user.value) {
      user.value = { ...user.value, avatar_identificador: identificador, avatar_url: url }
      avatarUrl.value = url
      persistirUser()
    }
  }

  function removerAvatar() {
    if (user.value) {
      user.value = { ...user.value, avatar_identificador: null, avatar_url: null }
      avatarUrl.value = ''
      persistirUser()
    }
  }

  return {
    token,
    user,
    apiBase,
    dispositivoId,
    avatarUrl,
    isAuthenticated,
    setApiBase,
    login,
    logout,
    atualizarAvatar,
    removerAvatar,
    resolverAvatarUrl,
  }
})
