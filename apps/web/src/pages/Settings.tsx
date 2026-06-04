export default function Settings() {
  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-serif mb-6">设置</h1>

        <section className="mb-6">
          <h2 className="text-lg mb-2">存储后端</h2>
          <p className="text-sm text-ink-500">
            [Supabase / Docker 选择 · 待实现]
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg mb-2">主题</h2>
          <p className="text-sm text-ink-500">[日间 / 夜间切换 · 待实现]</p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg mb-2">令牌管理</h2>
          <p className="text-sm text-ink-500">[查看 / 重新生成 · 待实现]</p>
        </section>
      </div>
    </main>
  )
}
