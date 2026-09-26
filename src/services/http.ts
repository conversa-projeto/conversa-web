// Endereco da API, token de login e o erro de sessao expirada. As chamadas
// da API ficam no cliente Eden (eden.ts).
const API_BASE_KEY = 'conversa.apiBase'
const TOKEN_KEY = 'conversa.token'

export class ErroNaoAutenticado extends Error {
  constructor(message = 'Sessão expirada') {
    super(message)
    this.name = 'ErroNaoAutenticado'
  }
}

export function getApiBase(): string {
  const stored = localStorage.getItem(API_BASE_KEY)
  const fallback = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost'

  return (stored || fallback).replace(/\/$/, '')
}

export function setApiBase(base: string) {
  const normalizado = base.trim().replace(/\/$/, '')
  localStorage.setItem(API_BASE_KEY, normalizado)
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function limparToken() {
  localStorage.removeItem(TOKEN_KEY)
}
