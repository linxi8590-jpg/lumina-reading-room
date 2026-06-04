import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocalStorage } from '../lib/useLocalStorage'

type Backend = 'docker' | 'supabase'

interface BackendGuide {
  label: string
  description: string
  steps: { kind: 'shell' | 'note'; text: string }[]
  docsPath: string
}

const BACKEND_GUIDES: Record<Backend, BackendGuide> = {
  docker: {
    label: '本地 / Docker',
    description:
      '在你自己的电脑、VPS、NAS 或 Coolify / Railway 上跑。最适合不想注册第三方服务的人。',
    steps: [
      { kind: 'note', text: '在 Lumina 项目目录里跑一次快速启动：' },
      { kind: 'shell', text: 'bash scripts/quickstart.sh' },
      { kind: 'note', text: '或者用 Docker：' },
      { kind: 'shell', text: 'docker compose up -d' },
      { kind: 'note', text: '脚本会生成 .env 和连接器令牌，并打印连接配置。' },
    ],
    docsPath: 'docs/deploy-docker.md',
  },
  supabase: {
    label: 'Supabase',
    description:
      '把书、笔记、阅读进度存在你自己的 Supabase 项目里。最适合不想跑服务器的人。一次只读一本书的话，免费层够用。',
    steps: [
      { kind: 'note', text: '在 Supabase 控制台建一个新项目（免费）。' },
      {
        kind: 'note',
        text: '把 deploy/supabase/schema.sql 的内容复制到 Supabase SQL Editor 跑一次。',
      },
      { kind: 'note', text: '把 Supabase URL 和 anon key 填进本地 .env 文件：' },
      {
        kind: 'shell',
        text: 'SUPABASE_URL=https://your-project.supabase.co\nSUPABASE_ANON_KEY=eyJxxx',
      },
      { kind: 'note', text: '然后照旧跑 quickstart 起连接器服务。' },
    ],
    docsPath: 'docs/deploy-supabase.md',
  },
}

const BACKEND_KEYS = Object.keys(BACKEND_GUIDES) as Backend[]

function isBackend(value: string): value is Backend {
  return value === 'docker' || value === 'supabase'
}

export default function Settings() {
  const [backendRaw, setBackend] = useLocalStorage(
    'lumina.storageBackend',
    'docker',
  )
  const backend: Backend = isBackend(backendRaw) ? backendRaw : 'docker'
  const guide = BACKEND_GUIDES[backend]

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

        <section aria-labelledby="storage-heading" className="mb-10">
          <h2 id="storage-heading" className="text-lg font-medium mb-2">
            存储后端
          </h2>
          <p className="text-sm text-ink-700 mb-4">
            选你自己舒服的方式保存书和笔记。
            <strong className="font-medium">
              数据存在你自己选的地方，不会跑到 Lumina 项目维护者的服务器上。
            </strong>
          </p>

          <fieldset className="mb-4">
            <legend className="sr-only">存储后端选择</legend>
            <div role="radiogroup" aria-label="存储后端选择" className="space-y-2">
              {BACKEND_KEYS.map((key) => {
                const active = backend === key
                const g = BACKEND_GUIDES[key]
                return (
                  <label
                    key={key}
                    className={`block border rounded-lg p-3 cursor-pointer transition-colors ${
                      active
                        ? 'border-lamp-500 bg-lamp-200/20'
                        : 'border-ink-500/20 bg-paper-100 hover:bg-paper-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="storage-backend"
                      value={key}
                      checked={active}
                      onChange={() => setBackend(key)}
                      aria-describedby={`backend-desc-${key}`}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-3 h-3 rounded-full border-2 transition-colors ${
                          active
                            ? 'border-lamp-500 bg-lamp-500'
                            : 'border-ink-500/40'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-medium">{g.label}</span>
                    </div>
                    <p
                      id={`backend-desc-${key}`}
                      className="text-xs text-ink-500 mt-1 ml-5"
                    >
                      {g.description}
                    </p>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <section
            aria-label={`${guide.label} 部署步骤`}
            className="bg-paper-100 rounded-lg p-4 border border-ink-500/15"
          >
            <h3 className="text-sm font-medium mb-3">
              {guide.label} · 部署步骤
            </h3>
            <div className="space-y-2">
              {guide.steps.map((step, idx) =>
                step.kind === 'shell' ? (
                  <pre
                    key={idx}
                    className="bg-paper-50 border border-ink-500/15 rounded p-2 text-xs overflow-x-auto"
                  >
                    <code>{step.text}</code>
                  </pre>
                ) : (
                  <p key={idx} className="text-sm text-ink-700">
                    {step.text}
                  </p>
                ),
              )}
            </div>
            <p className="text-xs text-ink-500 mt-4">
              更详细的小白指引见{' '}
              <code className="bg-paper-50 px-1 rounded">{guide.docsPath}</code>。
            </p>
          </section>

          <p className="text-xs text-ink-500 mt-3">
            这里只是选你想看哪份指引。真正切换需要按指引部署 / 配置 server，
            然后回{' '}
            <Link to="/connector" className="text-sky-700 underline">
              连接 AI
            </Link>{' '}
            页更新服务器地址和令牌。
          </p>
        </section>

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
    'http://localhost:8787',
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
