import { useState } from 'react'
import CopyButton from '../components/CopyButton'
import { useLocalStorage } from '../lib/useLocalStorage'

const DEFAULT_SERVER_URL = 'http://localhost:8787'

function maskToken(token: string) {
  if (!token) return ''
  if (token.length <= 8) return token
  return `${token.slice(0, 8)}${'•'.repeat(Math.max(8, token.length - 8))}`
}

export default function ConnectorConfig() {
  const [token, setToken] = useLocalStorage('lumina.connectorToken', '')
  const [serverUrl, setServerUrl] = useLocalStorage(
    'lumina.serverUrl',
    DEFAULT_SERVER_URL,
  )
  const [showToken, setShowToken] = useState(false)

  const normalizedServerUrl = serverUrl.replace(/\/$/, '')
  const mcpUrl = normalizedServerUrl ? `${normalizedServerUrl}/mcp` : ''
  const isTokenSet = token.trim().length > 0
  const isUrlSet = normalizedServerUrl.length > 0
  const tokenDisplay = showToken ? token : maskToken(token)

  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-serif mb-2">连接 AI</h1>
        <p className="text-ink-700 mb-8">
          你的 AI 还不知道你的书房在哪。把下面两行配置贴给它，它就能进来。
        </p>

        <section
          aria-labelledby="server-url-heading"
          className="bg-paper-100 rounded-lg p-4 mb-4"
        >
          <h2 id="server-url-heading" className="text-xs text-ink-500 mb-2">
            Lumina 地址（URL）
          </h2>
          <label className="block mb-2">
            <span className="sr-only">服务器地址</span>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8787"
              className="w-full bg-paper-50 border border-ink-500/20 rounded px-3 py-2 text-sm font-mono"
              aria-label="服务器地址输入框"
            />
          </label>
          <div className="flex items-center justify-between gap-3 mt-3">
            <code className="text-sm break-all flex-1 text-ink-700">
              {mcpUrl || <span className="text-ink-500">[请填写服务器地址]</span>}
            </code>
            <CopyButton value={mcpUrl} label="服务器地址" disabled={!isUrlSet} />
          </div>
        </section>

        <section
          aria-labelledby="connector-token-heading"
          className="bg-paper-100 rounded-lg p-4 mb-4"
        >
          <h2 id="connector-token-heading" className="text-xs text-ink-500 mb-2">
            连接器令牌（Token）
          </h2>
          <label className="block mb-2">
            <span className="sr-only">连接器令牌</span>
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="lrr_xxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-paper-50 border border-ink-500/20 rounded px-3 py-2 text-sm font-mono"
              aria-label="连接器令牌输入框"
            />
          </label>
          <div className="flex items-center justify-between gap-3 mt-3">
            <code className="text-sm break-all flex-1 text-ink-700">
              {isTokenSet ? tokenDisplay : (
                <span className="text-ink-500">[请填写令牌]</span>
              )}
            </code>
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? '隐藏令牌' : '显示令牌'}
              disabled={!isTokenSet}
              className="px-3 py-1 text-sm border border-ink-500/30 rounded hover:bg-paper-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {showToken ? '隐藏' : '显示'}
            </button>
            <CopyButton value={token} label="令牌" disabled={!isTokenSet} />
          </div>
          <p className="text-xs text-red-500 mt-3">
            这是你书房的钥匙。谁拿到它，谁就能让 AI 读你已经读过的内容。不要发到网上。
          </p>
        </section>

        <section
          aria-labelledby="quickstart-hint-heading"
          className="border border-dashed border-ink-500/30 rounded-lg p-4 mb-4 text-sm text-ink-700"
        >
          <h2 id="quickstart-hint-heading" className="font-medium mb-2">
            从哪里拿这两个值？
          </h2>
          <p>
            在 Lumina 项目目录下跑一次：
          </p>
          <pre className="bg-paper-50 border border-ink-500/15 rounded p-2 mt-2 text-xs overflow-x-auto">
            <code>bash scripts/quickstart.sh</code>
          </pre>
          <p className="mt-2">
            脚本会打印出服务器地址和令牌，把它们贴进上面两个框。
          </p>
        </section>

        <section
          aria-labelledby="ai-clients-heading"
          className="border border-dashed border-ink-500/30 rounded-lg p-4 text-sm text-ink-500"
        >
          <h2 id="ai-clients-heading" className="font-medium mb-2 text-ink-700">
            怎么粘到 AI
          </h2>
          <p>
            [Claude Desktop · ChatGPT · Codex · Claude Code 四个 tab + 截图指引 · 待实现]
          </p>
        </section>
      </div>
    </main>
  )
}
