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
  const configured = isConfigured()

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
      <header className="max-w-5xl mx-auto mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-serif">书架</h1>
        <Link
          to="/connector"
          className="text-sm text-sky-700 underline"
          aria-label="连接配置"
        >
          连接配置
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
          <p>你的书房现在很安静。上传一本书，开始共读。</p>
          <p className="text-xs mt-3">[上传按钮 · 待实现]</p>
        </section>
      ) : (
        <section
          aria-label={`书架，共 ${books.length} 本书`}
          className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {books.map((book) => (
            <Link
              key={book.id}
              to={`/reader/${book.id}`}
              className="block bg-paper-100 border border-ink-500/15 rounded-lg p-4 hover:bg-paper-50 transition-colors"
              aria-label={`${book.title}${book.author ? `，${book.author}` : ''}`}
            >
              <h2 className="font-serif text-lg mb-1">{book.title}</h2>
              {book.author && (
                <p className="text-sm text-ink-500">{book.author}</p>
              )}
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
