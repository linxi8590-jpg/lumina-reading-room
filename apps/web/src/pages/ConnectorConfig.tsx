import { useState } from 'react'
import CopyButton from '../components/CopyButton'
import { useLocalStorage } from '../lib/useLocalStorage'

const DEFAULT_SERVER_URL = 'http://localhost:8787'

interface AiClientGuide {
  id: string
  label: string
  description: string
  steps: string[]
  note: string
  docsLabel?: string
  docsHref?: string
}

const AI_CLIENTS: AiClientGuide[] = [
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    description: 'Anthropic 的桌面 Claude 客户端。',
    steps: [
      '在 Claude Desktop 里打开 Settings，找到 Connectors 或 MCP servers 入口。',
      '点添加 server，把上面拷贝的"服务器地址"和"连接器令牌"分别填进去。',
      '保存。打开一次新对话，对 Claude 说"陪我读这本书"，它会调 Lumina 工具拿当前页内容。',
    ],
    note: 'MCP 配置入口因 Claude Desktop 版本而异，按你实际界面找。',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    description: 'OpenAI 的 ChatGPT 桌面 / 网页版。',
    steps: [
      '在 ChatGPT 客户端打开 Settings，找到 Connectors / Tools / Apps 入口。',
      '添加一个远程 MCP server，填上面的服务器地址和 Bearer token。',
      '激活 Lumina connector，对 ChatGPT 说"读我现在那一页"。',
    ],
    note: 'OpenAI 官方 MCP 文档可以看下面的链接，对接细节按官方为准。',
    docsLabel: 'OpenAI MCP 文档',
    docsHref: 'https://developers.openai.com/api/docs/mcp',
  },
  {
    id: 'codex',
    label: 'Codex',
    description: 'OpenAI 的命令行 / IDE 编程助手。',
    steps: [
      '打开 Codex 的配置文件（通常在 ~/.codex/ 之类的目录里，按版本而定）。',
      '加一个 MCP server 条目，名字可以叫 lumina，填上面的服务器地址和 Bearer token。',
      '重启 Codex，会话里直接调用 lumina 的工具。',
    ],
    note: 'Codex MCP 配置位置因版本变化，以官方文档为准。',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    description: 'Anthropic 的命令行 Claude 编程助手。',
    steps: [
      '在终端用 Claude Code 的 MCP 子命令添加一个 server，名字写 lumina。',
      '把上面拷贝的服务器地址和 Bearer token 通过子命令的参数（或 header）传进去。',
      '在 Claude Code 会话里直接调 lumina 的工具，比如让它"读当前段"。',
    ],
    note: 'Claude Code 的 MCP 子命令名和参数以官方文档为准。',
  },
]

function maskToken(token: string) {
  if (!token) return ''
  if (token.length <= 8) return token
  return `${token.slice(0, 8)}${'•'.repeat(Math.max(8, token.length - 8))}`
}

export default function ConnectorConfig() {
  const [token, setToken] = useLocalStorage('lumina.connectorToken', '')
  const [tokenDraft, setTokenDraft] = useState('')
  const [tokenStatus, setTokenStatus] = useState('')
  const [serverUrl, setServerUrl] = useLocalStorage(
    'lumina.serverUrl',
    DEFAULT_SERVER_URL,
  )
  const [showToken, setShowToken] = useState(false)
  const [activeClient, setActiveClient] = useState<string>(AI_CLIENTS[0].id)

  const normalizedServerUrl = serverUrl.replace(/\/$/, '')
  const mcpUrl = normalizedServerUrl ? `${normalizedServerUrl}/mcp` : ''
  const isTokenSet = token.trim().length > 0
  const hasTokenDraft = tokenDraft.trim().length > 0
  const isUrlSet = normalizedServerUrl.length > 0
  const tokenDisplay = showToken ? token : maskToken(token)

  function saveTokenDraft() {
    const nextToken = tokenDraft.trim()
    if (!nextToken) return
    setToken(nextToken)
    setTokenDraft('')
    setShowToken(false)
    setTokenStatus('令牌已保存')
  }

  function clearToken() {
    setToken('')
    setTokenDraft('')
    setShowToken(false)
    setTokenStatus('令牌已清除')
  }

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
              type="password"
              value={tokenDraft}
              onChange={(e) => {
                setTokenDraft(e.target.value)
                setTokenStatus('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveTokenDraft()
                }
              }}
              placeholder={
                isTokenSet
                  ? '已保存令牌。粘贴新令牌可替换'
                  : 'lrr_xxxxxxxxxxxxxxxxxxxxx'
              }
              className="w-full bg-paper-50 border border-ink-500/20 rounded px-3 py-2 text-sm font-mono"
              aria-label="连接器令牌输入框"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              type="button"
              onClick={saveTokenDraft}
              disabled={!hasTokenDraft}
              className="px-3 py-1 text-sm border border-ink-500/30 rounded hover:bg-paper-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              保存令牌
            </button>
            <button
              type="button"
              onClick={clearToken}
              disabled={!isTokenSet}
              className="px-3 py-1 text-sm border border-ink-500/30 rounded hover:bg-paper-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              清除令牌
            </button>
            <span className="sr-only" aria-live="polite">
              {tokenStatus}
            </span>
          </div>
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
            脚本会打印出服务器地址和令牌。服务器地址贴进地址框；令牌贴进令牌框后点一次"保存令牌"。
          </p>
        </section>

        <section
          aria-labelledby="ai-clients-heading"
          className="border border-ink-500/15 rounded-lg p-4 bg-paper-100"
        >
          <h2
            id="ai-clients-heading"
            className="font-medium mb-3 text-ink-700"
          >
            怎么粘到 AI
          </h2>
          <p className="text-sm text-ink-700 mb-4">
            选你正在用的 AI 客户端，按下面的步骤把保存后的服务器地址和令牌贴进去。
          </p>

          <div
            role="tablist"
            aria-label="AI 客户端配置指引"
            className="flex flex-wrap gap-1 border-b border-ink-500/15 mb-3"
          >
            {AI_CLIENTS.map((client) => {
              const active = activeClient === client.id
              return (
                <button
                  key={client.id}
                  type="button"
                  role="tab"
                  id={`tab-${client.id}`}
                  aria-selected={active}
                  aria-controls={`panel-${client.id}`}
                  onClick={() => setActiveClient(client.id)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-lamp-500 text-ink-900'
                      : 'border-transparent text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {client.label}
                </button>
              )
            })}
          </div>

          {AI_CLIENTS.map((client) => {
            if (client.id !== activeClient) return null
            return (
              <div
                key={client.id}
                role="tabpanel"
                id={`panel-${client.id}`}
                aria-labelledby={`tab-${client.id}`}
                className="text-sm"
              >
                <p className="text-ink-700 mb-3">{client.description}</p>
                <ol className="space-y-2 mb-3 pl-1">
                  {client.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2 text-ink-700">
                      <span
                        aria-hidden="true"
                        className="text-ink-500 font-medium shrink-0"
                      >
                        {idx + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-ink-500 italic">{client.note}</p>
                {client.docsHref && (
                  <p className="text-xs text-ink-500 mt-2">
                    <a
                      href={client.docsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:text-sky-500 underline break-all"
                    >
                      {client.docsLabel ?? client.docsHref}
                    </a>
                  </p>
                )}
              </div>
            )
          })}
        </section>
      </div>
    </main>
  )
}
