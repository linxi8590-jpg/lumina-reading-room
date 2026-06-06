import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, isConfigured } from '../lib/api'

interface Book {
  id: string
  title: string
  author: string | null
  source_filename: string | null
  created_at: string
  updated_at: string
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
    <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
      <header className="max-w-5xl mx-auto mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-serif">书架</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            to="/upload"
            className="px-3 py-1 bg-lamp-500 text-ink-900 rounded font-medium hover:bg-lamp-200 transition-colors"
            aria-label="上传新书"
          >
            + 上传新书
          </Link>
          <Link
            to="/connector"
            className="text-sky-700 underline"
            aria-label="连接配置"
          >
            连接配置
          </Link>
          <Link
            to="/settings"
            className="text-sky-700 underline"
            aria-label="设置"
          >
            设置
          </Link>
        </nav>
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
          {books.map((book) => (
            <div
              key={book.id}
              className="relative bg-paper-100 border border-ink-500/15 rounded-lg hover:bg-paper-50 transition-colors"
            >
              <Link
                to={`/reader/${book.id}`}
                className="block p-4 pr-12"
                aria-label={`${book.title}${book.author ? `，${book.author}` : ''}`}
              >
                <h2 className="font-serif text-lg mb-1">{book.title}</h2>
                {book.author && (
                  <p className="text-sm text-ink-500">{book.author}</p>
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
          ))}
        </section>
      )}
    </main>
  )
}
