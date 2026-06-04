export default function ConnectorConfig() {
  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-serif mb-2">连接 AI</h1>
        <p className="text-ink-700 mb-8">
          你的 AI 还不知道你的书房在哪。给它两行配置，它就能进来。
        </p>

        <section
          aria-label="服务器地址"
          className="bg-paper-100 rounded-lg p-4 mb-4"
        >
          <div className="text-xs text-ink-500 mb-1">Lumina 地址（URL）</div>
          <code className="text-sm break-all">https://your-domain.example/mcp</code>
          <p className="text-xs text-ink-500 mt-2">[拷贝按钮 · 待实现]</p>
        </section>

        <section
          aria-label="连接器令牌"
          className="bg-paper-100 rounded-lg p-4 mb-4"
        >
          <div className="text-xs text-ink-500 mb-1">连接器令牌（Token）</div>
          <code className="text-sm break-all">lrr_••••••••••••••••</code>
          <p className="text-xs text-ink-500 mt-2">
            [拷贝按钮 + 显示切换 · 待实现]
          </p>
          <p className="text-xs text-red-500 mt-2">
            这是你书房的钥匙。不要发到网上。
          </p>
        </section>

        <p className="text-sm text-ink-500">
          [AI 客户端配置截图 tab · 待实现 — Claude Desktop / ChatGPT / Codex / Claude Code]
        </p>
      </div>
    </main>
  )
}
