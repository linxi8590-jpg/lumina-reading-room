import { useEffect, useMemo, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, isConfigured } from '../lib/api'
import ReadingWaterline from '../components/ReadingWaterline'
import NotesPanel from '../components/NotesPanel'
import type { ReadingNote } from '../components/NoteBubble'

interface Book {
  id: string
  title: string
  author: string | null
}

interface Section {
  id: string
  book_id: string
  section_index: number
  title: string
  text: string
  paragraphs: string[]
}

interface ReadingState {
  book_id: string
  current_section_index: number
  current_paragraph_index: number
  unlocked_section_index: number
  unlocked_paragraph_index: number
  updated_at: string
  book?: Book
  current_section?: {
    id: string
    section_index: number
    title: string
    paragraph_count: number
  } | null
}

interface BookPayload {
  book: Book
  sections: Section[]
  state: ReadingState
}

function compare(sectionA: number, paragraphA: number, sectionB: number, paragraphB: number) {
  if (sectionA !== sectionB) return sectionA - sectionB
  return paragraphA - paragraphB
}

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>()
  const [payload, setPayload] = useState<BookPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [notes, setNotes] = useState<ReadingNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const configured = isConfigured()

  useEffect(() => {
    if (!configured || !bookId) return
    let cancelled = false
    setError(null)
    api
      .get<BookPayload>(`/api/books/${bookId}`)
      .then((data) => {
        if (!cancelled) setPayload(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [bookId, configured])

  useEffect(() => {
    if (!configured || !bookId) return
    let cancelled = false
    setNotesLoading(true)
    setNotesError(null)
    api
      .get<{ notes: ReadingNote[] }>(`/api/books/${bookId}/notes`)
      .then((data) => {
        if (!cancelled) setNotes(data.notes)
      })
      .catch((err) => {
        if (!cancelled) setNotesError(err instanceof Error ? err.message : 'notes_failed')
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookId, configured])

  if (!configured) {
    return (
      <CenterMessage>
        先到{' '}
        <Link to="/connector" className="text-sky-700 underline">
          连接配置
        </Link>{' '}
        页填入服务器地址和连接器令牌。
      </CenterMessage>
    )
  }

  if (!bookId) {
    return (
      <CenterMessage>
        没有指定要读的书。回{' '}
        <Link to="/shelf" className="text-sky-700 underline">
          书架
        </Link>{' '}
        选一本。
      </CenterMessage>
    )
  }

  if (error) {
    return (
      <CenterMessage>
        <p className="text-red-500">加载失败：{error}</p>
        <p className="text-xs text-ink-500 mt-2">
          检查{' '}
          <Link to="/connector" className="text-sky-700 underline">
            连接配置
          </Link>{' '}
          或回{' '}
          <Link to="/shelf" className="text-sky-700 underline">
            书架
          </Link>
          。
        </p>
      </CenterMessage>
    )
  }

  if (!payload) {
    return (
      <CenterMessage aria-live="polite">加载中…</CenterMessage>
    )
  }

  const { book, sections, state } = payload
  const currentSection = sections[state.current_section_index]
  const sectionsById = useMemo(() => {
    const map = new Map<string, { title: string; section_index: number }>()
    for (const s of sections) {
      map.set(s.id, { title: s.title, section_index: s.section_index })
    }
    return map
  }, [sections])
  const totalParagraphsInBook = sections.reduce(
    (sum, s) => sum + s.paragraphs.length,
    0,
  )
  const unlockedParagraphCount = sections.reduce((sum, s) => {
    if (s.section_index < state.unlocked_section_index) return sum + s.paragraphs.length
    if (s.section_index === state.unlocked_section_index)
      return sum + state.unlocked_paragraph_index + 1
    return sum
  }, 0)

  async function advance(nextSectionIndex: number, nextParagraphIndex: number) {
    if (advancing) return
    setAdvancing(true)
    try {
      const res = await api.post<{ state: ReadingState }>(
        `/api/books/${bookId}/progress`,
        { section_index: nextSectionIndex, paragraph_index: nextParagraphIndex },
      )
      setPayload((prev) => (prev ? { ...prev, state: res.state } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'progress_failed')
    } finally {
      setAdvancing(false)
    }
  }

  function canAdvance(targetSection: number, targetParagraph: number) {
    if (!sections[targetSection]) return false
    if (targetParagraph < 0) return false
    if (targetParagraph >= sections[targetSection].paragraphs.length) return false
    return true
  }

  function isUnlocked(sectionIdx: number) {
    return sectionIdx <= state.unlocked_section_index
  }

  const nextParagraph = state.current_paragraph_index + 1
  const hasMoreInSection = currentSection && nextParagraph < currentSection.paragraphs.length
  const hasNextSection = state.current_section_index + 1 < sections.length

  return (
    <main className="min-h-screen bg-paper-50 text-ink-900">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_320px] min-h-screen">
        {/* 左：章节导航 */}
        <aside
          aria-label="章节导航"
          className="hidden md:block border-r border-ink-500/10 p-4 overflow-y-auto"
        >
          <Link
            to="/shelf"
            className="text-xs text-sky-700 underline mb-4 inline-block"
            aria-label="回书架"
          >
            ← 书架
          </Link>
          <h2 className="text-sm font-medium text-ink-700 mb-3 mt-2">
            {book.title}
          </h2>
          {book.author && (
            <p className="text-xs text-ink-500 mb-4">{book.author}</p>
          )}
          <nav>
            <ul className="space-y-1">
              {sections.map((section) => {
                const unlocked = isUnlocked(section.section_index)
                const isCurrent = section.section_index === state.current_section_index
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      disabled={!unlocked || advancing}
                      onClick={() => advance(section.section_index, 0)}
                      aria-label={`跳转到${section.title}${unlocked ? '' : '，未解锁'}`}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={`block w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                        isCurrent
                          ? 'bg-lamp-200 text-ink-900'
                          : unlocked
                            ? 'text-ink-700 hover:bg-paper-100'
                            : 'text-ink-500/60 cursor-not-allowed'
                      }`}
                    >
                      {section.title}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* 中：阅读区 */}
        <article className="px-6 py-6">
          <ReadingWaterline
            currentSectionIndex={state.current_section_index}
            currentParagraphIndex={state.current_paragraph_index}
            unlockedSectionIndex={state.unlocked_section_index}
            unlockedParagraphIndex={state.unlocked_paragraph_index}
            totalSections={sections.length}
            totalParagraphsInBook={totalParagraphsInBook}
            unlockedParagraphCount={unlockedParagraphCount}
            currentSectionTitle={currentSection?.title || null}
          />

          {currentSection ? (
            <div className="reading mx-auto pb-32">
              <h2 className="font-serif text-2xl mb-6">{currentSection.title}</h2>
              {currentSection.paragraphs.map((paragraph, idx) => {
                const isCurrent = idx === state.current_paragraph_index
                const isBeforeCurrent =
                  compare(
                    state.current_section_index,
                    idx,
                    state.current_section_index,
                    state.current_paragraph_index,
                  ) < 0
                return (
                  <p
                    key={`${currentSection.id}-${idx}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={`mb-6 transition-colors ${
                      isCurrent
                        ? 'border-l-2 border-lamp-500 pl-4 text-ink-900'
                        : isBeforeCurrent
                          ? 'text-ink-700'
                          : 'text-ink-500'
                    }`}
                  >
                    {paragraph}
                  </p>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-ink-500">没有内容。</p>
          )}

          {/* 翻段控制 */}
          <div
            aria-label="阅读控制"
            className="fixed bottom-0 left-0 right-0 md:left-[200px] md:right-[320px] bg-paper-50/95 backdrop-blur border-t border-ink-500/10 px-6 py-3 flex items-center justify-between gap-3"
          >
            <div className="text-xs text-ink-500">
              第 {state.current_paragraph_index + 1} 段 / 共{' '}
              {currentSection?.paragraphs.length ?? 0} 段
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  advancing ||
                  !canAdvance(
                    state.current_section_index,
                    state.current_paragraph_index - 1,
                  )
                }
                onClick={() =>
                  advance(
                    state.current_section_index,
                    state.current_paragraph_index - 1,
                  )
                }
                aria-label="上一段"
                className="px-3 py-1 text-sm border border-ink-500/30 rounded hover:bg-paper-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一段
              </button>
              <button
                type="button"
                disabled={advancing || (!hasMoreInSection && !hasNextSection)}
                onClick={() => {
                  if (hasMoreInSection) {
                    advance(state.current_section_index, nextParagraph)
                  } else if (hasNextSection) {
                    advance(state.current_section_index + 1, 0)
                  }
                }}
                aria-label={hasMoreInSection ? '下一段' : '下一章'}
                className="px-4 py-1 text-sm bg-lamp-500 text-ink-900 rounded font-medium hover:bg-lamp-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {hasMoreInSection ? '下一段' : '下一章'}
              </button>
            </div>
          </div>
        </article>

        {/* 右：笔记栏 */}
        <aside className="hidden md:block border-l border-ink-500/10 p-4 overflow-y-auto">
          <NotesPanel
            notes={notes}
            loading={notesLoading}
            error={notesError}
            sectionsById={sectionsById}
          />
        </aside>
      </div>
    </main>
  )
}

function CenterMessage({
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <main className="min-h-screen bg-paper-50 text-ink-900 flex items-center justify-center px-6">
      <div className="max-w-md text-center text-ink-700" {...rest}>
        {children}
      </div>
    </main>
  )
}
