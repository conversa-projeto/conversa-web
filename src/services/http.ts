const API_BASE_KEY = 'conversa.apiBase'
const TOKEN_KEY = 'conversa.token'

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

function buildUrl(path: string, query?: Record<string, string | number | boolean | null | undefined>): string {
  const url = new URL(`${getApiBase()}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue
      }
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export async function requestApi<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  options?: {
    query?: Record<string, string | number | boolean | null | undefined>
    body?: unknown
    isBinary?: boolean
    token?: string
    headers?: Record<string, string>
  }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers || {})
  }

  const token = options?.token || getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let body: BodyInit | undefined
  if (options?.body !== undefined) {
    if (options.isBinary) {
      headers['Content-Type'] = 'application/octet-stream'
      body = options.body as BodyInit
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }
  }

  const response = await fetch(buildUrl(path, options?.query), {
    method,
    headers,
    body
  })

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`
    try {
      const data = await response.json()
      message = data?.error || data?.message || message
    } catch {
      // ignora erro de parse
    }
    throw new Error(message)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

export function getAttachmentUrl(identificador: string): string {
  return buildUrl('/anexo', { identificador })
}
