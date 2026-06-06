import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDefaultServerUrl } from '../lib/serverConfig'
import { useLocalStorage } from '../lib/useLocalStorage'

export default function Settings() {
  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-serif">设置</h1>
          <Link to="/shelf" className="text-sm text-sky-700 underline">
            回书架
          </Link>
        </header>

        <Diagnostics />

        <section className="mb-10">
          <h2 className="text-lg font-medium mb-2">AI 连接</h2>
          <p className="text-sm text-ink-700 mb-3">
            连接器地址、令牌、四个 AI 客户端的配置指引都在专门的页面。
          </p>
          <Link
            to="/connector"
            className="inline-block px-3 py-1 text-sm border border-ink-500/30 rounded hover:bg-paper-100 transition-colors"
          >
            打开连接 AI 配置
          </Link>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">关于</h2>
          <p className="text-sm text-ink-700">
            星灯书房 · Lumina Reading Room
          </p>
          <p className="text-xs text-ink-500 mt-1">
            一个自托管的 AI 共读空间。AI 只能读你已经读过的页。
          </p>
        </section>
      </div>
    </main>
  )
}

type HealthStatus =
  | 'idle'
  | 'checking'
  | 'ok'
  | 'offline'
  | 'unexpected'

type AuthStatus =
  | 'idle'
  | 'checking'
  | 'not_configured'
  | 'ok'
  | 'invalid'
  | 'error'

const HEALTH_LABEL: Record<HealthStatus, string> = {
  idle: '未检查',
  checking: '检查中…',
  ok: '在线',
  offline: '联系不上',
  unexpected: '返回不像 Lumina server',
}

const AUTH_LABEL: Record<AuthStatus, string> = {
  idle: '未检查',
  checking: '检查中…',
  not_configured: '未配置令牌',
  ok: '令牌有效',
  invalid: '令牌无效或过期',
  error: '请求失败',
}

function Diagnostics() {
  const [serverUrlRaw] = useLocalStorage(
    'lumina.serverUrl',
    getDefaultServerUrl(),
  )
  const [token] = useLocalStorage('lumina.connectorToken', '')
  const [health, setHealth] = useState<HealthStatus>('idle')
  const [auth, setAuth] = useState<AuthStatus>('idle')

  const serverUrl = serverUrlRaw.replace(/\/$/, '')

  async function runChecks() {
    setHealth('checking')
    setAuth(token ? 'checking' : 'not_configured')

    const h = await checkHealth(serverUrl)
    setHealth(h)

    if (!token) return
    const a = await checkAuth(serverUrl, token)
    setAuth(a)
  }

  useEffect(() => {
    runChecks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section aria-labelledby="diagnostics-heading" className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 id="diagnostics-heading" className="text-lg font-medium">
          诊断
        </h2>
        <button
          type="button"
          onClick={runChecks}
          aria-label="重新检查连接状态"
          disabled={health === 'checking' || auth === 'checking'}
          className="text-xs px-2 py-1 border border-ink-500/30 rounded hover:bg-paper-100 disabled:opacity-40 transition-colors"
        >
          重新检查
        </button>
      </div>
      <p className="text-sm text-ink-700 mb-4">
        检查 server 是否在线、你的令牌是否有效。这是配完连接器后第一次确认"接上没"的地方。
      </p>

      <ul aria-label="连接状态" className="space-y-2">
        <li className="flex items-center gap-3 bg-paper-100 rounded-lg p-3 border border-ink-500/15">
          <StatusDot status={health} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">服务器 (/health)</div>
            <div className="text-xs text-ink-500 break-all">
              {serverUrl || '未填写地址'}
            </div>
          </div>
          <div
            className="text-sm text-ink-700"
            aria-live="polite"
          >
            {HEALTH_LABEL[health]}
          </div>
        </li>
        <li className="flex items-center gap-3 bg-paper-100 rounded-lg p-3 border border-ink-500/15">
          <StatusDot status={auth} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">连接器令牌</div>
            <div className="text-xs text-ink-500">
              {token
                ? '已存到本地，调 /api/books 验证。'
                : '还没填，前往连接 AI 页面设置。'}
            </div>
          </div>
          <div className="text-sm text-ink-700" aria-live="polite">
            {AUTH_LABEL[auth]}
          </div>
        </li>
      </ul>

      {(health === 'offline' || auth === 'invalid' || auth === 'error') && (
        <p className="text-xs text-ink-500 mt-3">
          检查地址和令牌是否在{' '}
          <Link to="/connector" className="text-sky-700 underline">
            连接 AI
          </Link>{' '}
          页里填对了。Server 没起的话跑一次{' '}
          <code className="bg-paper-100 px-1 rounded">bash scripts/quickstart.sh</code>。
        </p>
      )}
    </section>
  )
}

function StatusDot({ status }: { status: HealthStatus | AuthStatus }) {
  const color =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'checking'
        ? 'bg-ink-500/40 animate-pulse'
        : status === 'idle' || status === 'not_configured'
          ? 'bg-ink-500/40'
          : 'bg-red-500'
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-3 h-3 rounded-full shrink-0 ${color}`}
    />
  )
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function checkHealth(serverUrl: string): Promise<HealthStatus> {
  if (!serverUrl) return 'offline'
  try {
    const res = await fetchWithTimeout(`${serverUrl}/health`)
    if (!res.ok) return 'unexpected'
    const data = (await res.json()) as {
      ok?: boolean
      service?: string
    }
    return data.ok && data.service === 'lumina-server' ? 'ok' : 'unexpected'
  } catch {
    return 'offline'
  }
}

async function checkAuth(
  serverUrl: string,
  token: string,
): Promise<AuthStatus> {
  if (!serverUrl) return 'error'
  try {
    const res = await fetchWithTimeout(`${serverUrl}/api/books`, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (res.status === 401) return 'invalid'
    if (!res.ok) return 'error'
    return 'ok'
  } catch {
    return 'error'
  }
}
