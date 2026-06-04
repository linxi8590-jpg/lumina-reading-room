import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, isConfigured } from '../lib/api'

interface ImportResponse {
  book: { id: string; title: string }
  sections_count: number
}

export default function Upload() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [text, setText] = useState('')
  const [filename, setFilename] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isConfigured()) {
    return (
      <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-serif mb-4">上传一本书</h1>
          <p className="text-ink-700 mb-6">
            先到{' '}
            <Link to="/connector" className="text-sky-700 underline">
              连接配置
            </Link>{' '}
            页填入服务器地址和连接器令牌。
          </p>
        </div>
      </main>
    )
  }

  async function handleFile(file: File) {
    setFilename(file.name)
    if (!title) {
      setTitle(file.name.replace(/\.(txt|md|markdown)$/i, ''))
    }
    const content = await file.text()
    setText(content)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !text.trim()) {
      setError('标题和正文都不能为空')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post<ImportResponse>('/api/books/import', {
        title: title.trim(),
        author: author.trim() || undefined,
        text,
        source_filename: filename,
      })
      navigate(`/reader/${res.book.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-serif">上传一本书</h1>
          <Link to="/shelf" className="text-sm text-sky-700 underline">
            回书架
          </Link>
        </header>
        <p className="text-ink-700 mb-6">
          选一个 TXT 或 Markdown 文件，或者直接把正文粘贴到下面。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="upload-file"
              className="block text-xs text-ink-500 mb-1"
            >
              选择文件（可选）
            </label>
            <input
              id="upload-file"
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
              className="text-sm"
            />
            {filename && (
              <p className="text-xs text-ink-500 mt-1" aria-live="polite">
                已选择：{filename}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="upload-title"
              className="block text-xs text-ink-500 mb-1"
            >
              标题
            </label>
            <input
              id="upload-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-paper-100 border border-ink-500/20 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="upload-author"
              className="block text-xs text-ink-500 mb-1"
            >
              作者（可选）
            </label>
            <input
              id="upload-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-paper-100 border border-ink-500/20 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="upload-text"
              className="block text-xs text-ink-500 mb-1"
            >
              正文
            </label>
            <textarea
              id="upload-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              rows={10}
              placeholder="把书的正文贴进来。支持 Markdown 标题（# / ## / ###）和「第 N 章」作为章节分隔。"
              className="w-full bg-paper-100 border border-ink-500/20 rounded px-3 py-2 text-sm font-serif leading-relaxed"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500" aria-live="polite">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              aria-label="保存到书房"
              className="px-4 py-2 bg-lamp-500 text-ink-900 rounded font-medium hover:bg-lamp-200 disabled:opacity-50 transition-colors"
            >
              {submitting ? '导入中…' : '保存到书房'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
