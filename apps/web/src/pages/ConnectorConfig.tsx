import { useState } from 'react'
import CopyButton from '../components/CopyButton'
import { getDefaultServerUrl } from '../lib/serverConfig'
import { useLocalStorage } from '../lib/useLocalStorage'

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
    id: 'claude-ai',
    label: 'Claude.ai',
    description: 'Claude 网页版、桌面端和移动端共享的远程连接器。',
    steps: [
      '确认 Lumina 地址是公网 HTTPS，不是 localhost。',
      '在 Claude 打开 Customize > Connectors，添加 custom connector。',
      '把下面生成的 Connector URL 粘进去，名字写 Lumina。',
      '保存后在对话左下角的 Connectors 菜单里启用 Lumina。',
    ],
    note: 'Claude 的远程连接器由 Anthropic 云端访问，所以本机 localhost 地址不能直接使用。',
    docsLabel: 'Claude custom connectors 文档',
    docsHref:
      'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp',
  },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    description: 'Claude Desktop 的远程 Connectors 入口。',
    steps: [
      '远程连接器走 Settings > Connectors，填写方式和 Claude.ai 相同。',
      '如果你配置的是本地 claude_desktop_config.json，那是另一套本地 MCP 机制，不适合 Claude.ai / 移动端复用。',
      '完成后打开新对话，对 Claude 说"陪我读这本书"。',
    ],
    note: '为了能在 Claude.ai 和手机端一起使用，优先走远程 Connectors，而不是只在桌面本机生效的 stdio MCP。',
    docsLabel: 'Claude remote MCP 文档',
    docsHref:
      'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    description: 'OpenAI 的 ChatGPT 桌面 / 网页版。',
    steps: [
      '确认 Lumina 地址是公网 HTTPS，不是 localhost。',
      '在 ChatGPT 的 Apps / Connectors / Developer 入口添加远程 MCP server。',
      '用下面生成的 MCP URL 和 Authorization token 填写配置。',
      '激活 Lumina connector，对 ChatGPT 说"读我现在那一页"。',
    ],
    note: 'OpenAI API 里的远程 MCP 配置使用 server_url 和 authorization；ChatGPT 界面字段名以当前客户端为准。',
    docsLabel: 'OpenAI MCP 文档',
    docsHref: 'https://developers.openai.com/api/docs/guides/tools-connectors-mcp',
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
    docsLabel: 'Claude Code MCP 文档',
    docsHref: 'https://docs.anthropic.com/en/docs/claude-code/mcp',
  },
]

interface ConfigBlockProps {
  title: string
  description?: string
  value: string
  copyLabel: string
  disabled?: boolean
}

function maskToken(token: string) {
  if (!token) return ''
  if (token.length <= 8) return token
  return `${token.slice(0, 8)}${'•'.repeat(Math.max(8, token.length - 8))}`
}

function ConfigBlock({
  title,
  description,
  value,
  copyLabel,
  disabled,
}: ConfigBlockProps) {
  return (
    <div className="border border-ink-500/15 rounded p-3 bg-paper-50">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xs font-medium text-ink-700">{title}</h3>
          {description && (
            <p className="text-xs text-ink-500 mt-1">{description}</p>
          )}
        </div>
        <CopyButton value={value} label={copyLabel} disabled={disabled} />
      </div>
      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono text-ink-700">
        <code>{value}</code>
      </pre>
    </div>
  )
}

export default function ConnectorConfig() {
  const [token, setToken] = useLocalStorage('lumina.connectorToken', '')
  const [tokenDraft, setTokenDraft] = useState('')
  const [tokenStatus, setTokenStatus] = useState('')
  const [serverUrl, setServerUrl] = useLocalStorage(
    'lumina.serverUrl',
    getDefaultServerUrl(),
  )
  const [showToken, setShowToken] = useState(false)
  const [activeClient, setActiveClient] = useState<string>(AI_CLIENTS[0].id)

  const normalizedServerUrl = serverUrl.replace(/\/$/, '')
  const mcpUrl = normalizedServerUrl ? `${normalizedServerUrl}/mcp` : ''
  const isTokenSet = token.trim().length > 0
  const hasTokenDraft = tokenDraft.trim().length > 0
  const isUrlSet = normalizedServerUrl.length > 0
  const tokenDisplay = showToken ? token : maskToken(token)
  const tokenValue = isTokenSet ? token : '<connector-token>'
  const authHeaderValue = `Bearer ${tokenValue}`
  const connectorUrlWithToken =
    mcpUrl && isTokenSet ? `${mcpUrl}?token=${encodeURIComponent(token)}` : ''
  const connectorUrlPreview =
    connectorUrlWithToken || 'https://your-domain.example/mcp?token=<connector-token>'
  const needsPublicHttps =
    normalizedServerUrl.startsWith('http://localhost') ||
    normalizedServerUrl.startsWith('http://127.0.0.1') ||
    normalizedServerUrl.startsWith('http://0.0.0.0')
  const configReady = isUrlSet && isTokenSet
  const chatGptToolJson = JSON.stringify(
    {
      type: 'mcp',
      server_label: 'lumina',
      server_description:
        'Lumina Reading Room connector. It reads only the reader-unlocked book context and notes.',
      server_url: mcpUrl || 'https://your-domain.example/mcp',
      authorization: tokenValue,
      require_approval: 'always',
    },
    null,
    2,
  )
  const claudeApiJson = JSON.stringify(
    {
      mcp_servers: [
        {
          type: 'url',
          url: mcpUrl || 'https://your-domain.example/mcp',
          name: 'lumina',
          authorization_token: tokenValue,
        },
      ],
      tools: [{ type: 'mcp_toolset', mcp_server_name: 'lumina' }],
    },
    null,
    2,
  )
  const claudeCodeJson = JSON.stringify(
    {
      mcpServers: {
        lumina: {
          type: 'http',
          url: mcpUrl || 'https://your-domain.example/mcp',
          headers: {
            Authorization: authHeaderValue,
          },
        },
      },
    },
    null,
    2,
  )
  const codexToml = `[mcp_servers.lumina]
url = "${mcpUrl || 'https://your-domain.example/mcp'}"
http_headers = { Authorization = "${authHeaderValue}" }`

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
              placeholder={getDefaultServerUrl()}
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
          {needsPublicHttps && (
            <p className="text-xs text-amber-700 mt-3">
              这个地址只适合本机测试。ChatGPT 和 Claude.ai 需要公网 HTTPS，比如 Cloudflare Tunnel 或自己的域名。
            </p>
          )}
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
          <div className="flex items-center justify-between gap-3 mt-2">
            <code className="text-sm break-all flex-1 text-ink-700">
              {isTokenSet ? authHeaderValue : (
                <span className="text-ink-500">
                  Authorization: Bearer [请填写令牌]
                </span>
              )}
            </code>
            <CopyButton
              value={authHeaderValue}
              label="Authorization header"
              disabled={!isTokenSet}
            />
          </div>
          <div className="flex items-center justify-between gap-3 mt-2">
            <code className="text-sm break-all flex-1 text-ink-700">
              {configReady ? connectorUrlWithToken : (
                <span className="text-ink-500">
                  https://your-domain.example/mcp?token=[请填写令牌]
                </span>
              )}
            </code>
            <CopyButton
              value={connectorUrlWithToken}
              label="网页连接器 URL"
              disabled={!configReady}
            />
          </div>
          <p className="text-xs text-red-500 mt-3">
            令牌、Authorization 行、带 token 的连接器 URL 都是你书房的钥匙。谁拿到它，谁就能让 AI 读你已经读过的内容。不要发到网上。
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
            也可以跑 <code>npm run connector:config</code> 打印 ChatGPT、Claude 和 Claude Code 可复制配置。
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
                <div className="grid gap-3 mb-4">
                  {(client.id === 'claude-ai' ||
                    client.id === 'claude-desktop') && (
                    <>
                      <ConfigBlock
                        title="Connector URL（含 token）"
                        description="Claude.ai / Claude Desktop 的远程 connector URL；适合只让你填 URL 的界面。这个链接包含钥匙。"
                        value={connectorUrlPreview}
                        copyLabel="Claude Connector URL"
                        disabled={!configReady}
                      />
                      <ConfigBlock
                        title="Connector URL（不含 token）"
                        description="如果界面支持 OAuth / authorization 单独配置，可以用这个干净 URL。"
                        value={mcpUrl || 'https://your-domain.example/mcp'}
                        copyLabel="Claude clean Connector URL"
                        disabled={!isUrlSet}
                      />
                      <ConfigBlock
                        title="Claude API 配置"
                        description="如果你用 Claude Messages API 直连 MCP，可复制这个 JSON 片段。"
                        value={claudeApiJson}
                        copyLabel="Claude API MCP 配置"
                        disabled={!configReady}
                      />
                    </>
                  )}
                  {client.id === 'chatgpt' && (
                    <>
                      <ConfigBlock
                        title="ChatGPT 连接器 URL（含 token）"
                        description="给 ChatGPT Apps / Developer mode 里只填 remote MCP URL 的界面使用。这个链接包含钥匙。"
                        value={connectorUrlPreview}
                        copyLabel="ChatGPT 连接器 URL"
                        disabled={!configReady}
                      />
                      <ConfigBlock
                        title="MCP URL"
                        description="如果界面把 URL 和认证分开填，server_url 填这一行。"
                        value={mcpUrl || 'https://your-domain.example/mcp'}
                        copyLabel="ChatGPT MCP URL"
                        disabled={!isUrlSet}
                      />
                      <ConfigBlock
                        title="Authorization token"
                        description="OpenAI API 的 authorization 字段填 token 本体；界面若要求 Bearer header，则复制上面的 Authorization 行。"
                        value={tokenValue}
                        copyLabel="ChatGPT Authorization token"
                        disabled={!isTokenSet}
                      />
                      <ConfigBlock
                        title="Responses API tool JSON"
                        description="给开发者测试用；ChatGPT 界面通常只需要上面两个字段。"
                        value={chatGptToolJson}
                        copyLabel="ChatGPT MCP JSON"
                        disabled={!configReady}
                      />
                    </>
                  )}
                  {client.id === 'codex' && (
                    <ConfigBlock
                      title="Codex config.toml 片段"
                      description="写入用户级 Codex config；项目内配置不一定能覆盖本机 MCP 设置。"
                      value={codexToml}
                      copyLabel="Codex MCP 配置"
                      disabled={!configReady}
                    />
                  )}
                  {client.id === 'claude-code' && (
                    <>
                      <ConfigBlock
                        title="Claude Code 命令"
                        description="Claude Code 官方推荐 HTTP 远程 server；这一行直接带 Authorization header。"
                        value={`claude mcp add --transport http lumina ${mcpUrl || 'https://your-domain.example/mcp'} --header "Authorization: ${authHeaderValue}"`}
                        copyLabel="Claude Code 命令"
                        disabled={!configReady}
                      />
                      <ConfigBlock
                        title="Claude Code / SDK MCP JSON"
                        description="适合 HTTP MCP server；如果客户端要求 SSE，把 type 改成 sse。"
                        value={claudeCodeJson}
                        copyLabel="Claude Code MCP 配置"
                        disabled={!configReady}
                      />
                    </>
                  )}
                </div>
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
