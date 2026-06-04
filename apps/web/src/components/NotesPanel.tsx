import { useMemo, useState } from 'react'
import NoteBubble from './NoteBubble'
import type { NoteType, ReadingNote } from './NoteBubble'
import {
  downloadMarkdown,
  notesToMarkdown,
  safeFilename,
} from '../lib/notesExport'

type Filter = 'all' | 'mine' | 'ai' | NoteType

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'mine', label: '我的' },
  { value: 'ai', label: 'AI 的' },
  { value: 'reflection', label: '感受' },
  { value: 'highlight', label: '重点' },
  { value: 'quote', label: '金句' },
  { value: 'question', label: '疑问' },
  { value: 'review_card', label: '复习卡' },
]

interface NotesPanelProps {
  notes: ReadingNote[]
  loading?: boolean
  error?: string | null
  sectionsById?: Map<string, { title: string; section_index: number }>
  bookTitle?: string
}

export default function NotesPanel({
  notes,
  loading,
  error,
  sectionsById,
  bookTitle,
}: NotesPanelProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return notes
    if (filter === 'mine') return notes.filter((n) => n.author_type === 'user')
    if (filter === 'ai') return notes.filter((n) => n.author_type === 'ai')
    return notes.filter((n) => n.note_type === filter)
  }, [notes, filter])

  const grouped = useMemo(() => {
    const groups = new Map<string, ReadingNote[]>()
    for (const note of filtered) {
      const key = note.section_id || '__no_section__'
      const list = groups.get(key)
      if (list) {
        list.push(note)
      } else {
        groups.set(key, [note])
      }
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const aIdx = sectionsById?.get(a[0])?.section_index ?? Number.MAX_SAFE_INTEGER
      const bIdx = sectionsById?.get(b[0])?.section_index ?? Number.MAX_SAFE_INTEGER
      return aIdx - bIdx
    })
  }, [filtered, sectionsById])

  function handleExport() {
    const title = bookTitle?.trim() || '未命名书'
    const markdown = notesToMarkdown({
      bookTitle: title,
      notes,
      sectionsById,
    })
    const stem = safeFilename(title)
    const date = new Date().toISOString().slice(0, 10)
    downloadMarkdown(`${stem}-notes-${date}.md`, markdown)
  }

  return (
    <section aria-label="读书笔记栏" className="text-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-ink-700">笔记</h2>
        {notes.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            aria-label="导出全部笔记为 Markdown 文件"
            className="text-xs text-sky-700 hover:text-sky-500 underline"
          >
            导出 .md
          </button>
        )}
      </div>

      <nav aria-label="笔记过滤" className="flex flex-wrap gap-1 mb-4">
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
              aria-label={`过滤为${f.label}`}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                active
                  ? 'bg-lamp-500 text-ink-900'
                  : 'text-ink-500 hover:bg-paper-100'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </nav>

      {loading && (
        <p className="text-xs text-ink-500" aria-live="polite">
          载入中…
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500" role="alert">
          笔记加载失败：{error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-xs text-ink-500">
          {notes.length === 0
            ? '还没有笔记。读到有感觉的段落，写一条吧。'
            : '当前过滤下没有笔记。'}
        </p>
      )}

      {grouped.map(([sectionId, sectionNotes]) => {
        const section = sectionsById?.get(sectionId)
        const heading = section
          ? `第 ${section.section_index + 1} 章 · ${section.title}`
          : '未关联章节'
        return (
          <section
            key={sectionId}
            aria-label={`${heading} 的笔记`}
            className="mb-5"
          >
            <h3 className="text-xs text-ink-500 mb-2 sticky top-0 bg-paper-50/80 backdrop-blur py-1">
              {heading}
            </h3>
            {sectionNotes.map((note) => (
              <NoteBubble key={note.id} note={note} />
            ))}
          </section>
        )
      })}
    </section>
  )
}
