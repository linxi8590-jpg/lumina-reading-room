export default function Reader() {
  return (
    <main className="min-h-screen bg-paper-50 text-ink-900">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_320px] min-h-screen">
        <aside
          aria-label="章节导航"
          className="hidden md:block border-r border-ink-500/15 p-4"
        >
          <p className="text-sm text-ink-500">[章节列表 · 待实现]</p>
        </aside>
        <article className="px-6 py-12">
          <div
            aria-label="阅读进度，水位线在第 0 章第 0 段"
            className="sticky top-0 bg-paper-50 py-2 mb-4"
          >
            <div className="h-1 bg-paper-100 rounded">
              <div className="h-1 bg-lamp-500 rounded" style={{ width: '0%' }} />
            </div>
            <p className="text-xs text-ink-500 mt-1">水位线 · 待实现</p>
          </div>
          <div className="reading mx-auto">
            <p className="text-ink-500">[Reader · 待实现]</p>
          </div>
        </article>
        <aside
          aria-label="读书笔记栏"
          className="hidden md:block border-l border-ink-500/15 p-4"
        >
          <p className="text-sm text-ink-500">[NotesPanel · 待实现]</p>
        </aside>
      </div>
    </main>
  )
}
