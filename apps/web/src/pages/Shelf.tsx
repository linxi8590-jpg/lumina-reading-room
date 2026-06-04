export default function Shelf() {
  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-2xl font-serif">书架</h1>
        <p className="text-sm text-ink-500" aria-label="此页待实现">
          [Shelf · 待实现]
        </p>
      </header>
      <section aria-label="书架，共 0 本书" className="max-w-5xl mx-auto">
        <div className="border border-dashed border-ink-500/30 rounded-lg p-12 text-center text-ink-500">
          你的书房现在很安静。上传一本书，开始共读。
        </div>
      </section>
    </main>
  )
}
