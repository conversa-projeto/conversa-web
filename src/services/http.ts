function getApiBase(): string {
  const local = localStorage.getItem('conversa.apiBase')
  const fallback =
    import.meta.env.VITE_API_BASE ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:90`
      : 'http://localhost:90')
  let base = local || fallback

  if (typeof window !== 'undefined') {
    const hostAtual = window.location.hostname
    base = base.replace('://localhost:', `://${hostAtual}:`)
    base = base.replace('://127.0.0.1:', `://${hostAtual}:`)
  }

  if (base.endsWith(':9000')) {
    base = base.replace(':9000', ':90')
  }

  return base.replace(/\/$/, '')
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

  const token = options?.token || localStorage.getItem('conversa.token')
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
