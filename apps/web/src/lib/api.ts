export class ApiError extends Error {
  status: number
  code: string | undefined

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const DEFAULT_SERVER_URL = 'http://localhost:8787'

function getConfig() {
  if (typeof window === 'undefined') {
    return { url: DEFAULT_SERVER_URL, token: '' }
  }
  const rawUrl =
    window.localStorage.getItem('lumina.serverUrl') || DEFAULT_SERVER_URL
  const token = window.localStorage.getItem('lumina.connectorToken') || ''
  return { url: rawUrl.replace(/\/$/, ''), token }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, token } = getConfig()
  if (!token) {
    throw new ApiError(0, 'connector_token_not_configured', 'missing_token')
  }

  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${token}`)
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(`${url}${path}`, { ...init, headers })
  } catch (err) {
    throw new ApiError(
      0,
      err instanceof Error ? err.message : 'network_error',
      'network_error',
    )
  }

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { raw: text }
    }
  }

  if (!res.ok) {
    const errorBody = body as { error?: string; message?: string } | null
    const code = errorBody?.error
    const message = errorBody?.message || code || `HTTP ${res.status}`
    throw new ApiError(res.status, message, code)
  }

  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
}

export function isConfigured() {
  if (typeof window === 'undefined') return false
  return Boolean(window.localStorage.getItem('lumina.connectorToken'))
}
