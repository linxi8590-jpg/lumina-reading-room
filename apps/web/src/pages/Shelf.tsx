import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, isConfigured } from '../lib/api'

interface BookProgress {
  total_sections: number
  total_paragraphs: number
  read_paragraphs: number
  current_section_index: number
  current_paragraph_index: number
  current_section_title: string | null
}

interface Book {
  id: string
  title: string
  author: string | null
  source_filename: string | null
  created_at: string
  updated_at: string
  progress?: BookProgress
}

interface BooksResponse {
  books: Book[]
}

export default function Shelf() {
  const [books, setBooks] = useState<Book[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const configured = isConfigured()

  async function handleDelete(book: Book) {
    if (deletingId) return
    const confirmed = window.confirm(
      `确认删除《${book.title}》？这本书的全部内容、笔记和阅读进度都会一起删除，无法恢复。`,
    )
    if (!confirmed) return
    setDeletingId(book.id)
    try {
      await api.delete(`/api/books/${book.id}`)
      setBooks((prev) => (prev ? prev.filter((b) => b.id !== book.id) : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete_failed')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (!configured) return
    let cancelled = false
    api
      .get<BooksResponse>('/api/books')
      .then((data) => {
        if (!cancelled) setBooks(data.books)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [configured])

  if (!configured) {
    return (
      <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-serif mb-4">书架</h1>
          <p className="text-ink-700 mb-6">
            先到{' '}
            <Link
              to="/connector"
              className="text-sky-700 underline"
              aria-label="前往连接配置页"
            >
              连接配置
            </Link>{' '}
            页填入服务器地址和连接器令牌。
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 px-5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
      <header className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-2xl font-serif">书架</h1>
          <nav className="flex items-center gap-3 text-sm" aria-label="次要导航">
            <Link
              to="/connector"
              className="text-ink-500 hover:text-sky-700 transition-colors"
              aria-label="连接配置"
              title="连接配置"
            >
              连接
            </Link>
            <Link
              to="/settings"
              className="text-ink-500 hover:text-sky-700 transition-colors"
              aria-label="设置"
              title="设置"
            >
              设置
            </Link>
          </nav>
        </div>
        <Link
          to="/upload"
          className="inline-block px-3 py-1.5 bg-lamp-500 text-ink-900 rounded font-medium hover:bg-lamp-200 transition-colors text-sm"
          aria-label="上传新书"
        >
          + 上传新书
        </Link>
      </header>

      {error ? (
        <section
          className="max-w-5xl mx-auto bg-paper-100 border border-red-500/30 rounded-lg p-4 text-red-500"
          aria-live="polite"
        >
          <p>书架加载失败：{error}</p>
          <p className="text-xs text-ink-500 mt-2">
            检查{' '}
            <Link to="/connector" className="text-sky-700 underline">
              连接配置
            </Link>{' '}
            的服务器地址和令牌是否正确。
          </p>
        </section>
      ) : books === null ? (
        <p className="text-center text-ink-500" aria-live="polite">
          加载中…
        </p>
      ) : books.length === 0 ? (
        <section
          aria-label="书架，空"
          className="max-w-5xl mx-auto border border-dashed border-ink-500/30 rounded-lg p-12 text-center text-ink-500"
        >
          <p className="mb-4">你的书房现在很安静。上传一本书，开始共读。</p>
          <Link
            to="/upload"
            className="inline-block px-4 py-2 bg-lamp-500 text-ink-900 rounded font-medium hover:bg-lamp-200 transition-colors"
            aria-label="上传一本书"
          >
            上传一本书
          </Link>
        </section>
      ) : (
        <section
          aria-label={`书架，共 ${books.length} 本书`}
          className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {books.map((book) => {
            const p = book.progress
            const percent = p && p.total_paragraphs > 0
              ? Math.round((p.read_paragraphs / p.total_paragraphs) * 100)
              : 0
            const isUnread = !p || p.read_paragraphs <= 1
            const statusLine = !p
              ? null
              : isUnread
                ? `共 ${p.total_sections} 章 / ${p.total_paragraphs} 段，未开始`
                : `${p.current_section_title ?? '阅读中'} · 第 ${p.current_paragraph_index + 1} 段 · ${percent}%`
            const ariaLabel = `《${book.title}》${book.author ? `，作者${book.author}` : ''}${
              p ? `，${isUnread ? '尚未开始' : `已读 ${percent} %`}` : ''
            }`
            return (
              <div
                key={book.id}
                className="relative bg-paper-100 border border-ink-500/15 rounded-lg shadow-sm hover:shadow-md hover:bg-paper-50 transition-all overflow-hidden"
              >
                <Link
                  to={`/reader/${book.id}`}
                  className="block p-4 pr-12"
                  aria-label={ariaLabel}
                >
                  <h2 className="font-serif text-lg mb-1 leading-snug">{book.title}</h2>
                  {book.author && (
                    <p className="text-sm text-ink-500 mb-2">{book.author}</p>
                  )}
                  {statusLine && (
                    <p className="text-xs text-ink-500 mt-3 leading-relaxed">
                      {statusLine}
                    </p>
                  )}
                  {p && p.total_paragraphs > 0 && (
                    <div
                      className="mt-2 h-1 bg-paper-50 rounded overflow-hidden"
                      role="progressbar"
                      aria-label={`阅读进度 ${percent}%`}
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full bg-lamp-500 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(book)}
                  disabled={deletingId === book.id}
                  aria-label={`删除《${book.title}》`}
                  className="absolute top-2 right-2 px-2 py-1 text-xs text-ink-500 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {deletingId === book.id ? '删除中…' : '删除'}
                </button>
              </div>
            )
          })}
        </section>
      )}
    </main>
  )
}
