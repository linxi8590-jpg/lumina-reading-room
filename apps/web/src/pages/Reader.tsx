import { useEffect, useMemo, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, isConfigured } from '../lib/api'
import ReadingWaterline from '../components/ReadingWaterline'
import NotesPanel from '../components/NotesPanel'
import NoteComposer from '../components/NoteComposer'
import ReaderControls from '../components/ReaderControls'
import { useReaderPrefs } from '../lib/useReaderPrefs'
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

export default function Reader() {
  const { bookId } = useParams<{ bookId: string }>()
  const [payload, setPayload] = useState<BookPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [notes, setNotes] = useState<ReadingNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [composerParagraphIdx, setComposerParagraphIdx] = useState<number | null>(null)
  const [mobileDrawer, setMobileDrawer] = useState<'chapters' | 'notes' | null>(null)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const { fontSize } = useReaderPrefs()
  const configured = isConfigured()

  useEffect(() => {
    if (!mobileDrawer) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileDrawer(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileDrawer])
  const sectionsForNotes = payload?.sections ?? []
  const sectionsById = useMemo(() => {
    const map = new Map<string, { title: string; section_index: number }>()
    for (const s of sectionsForNotes) {
      map.set(s.id, { title: s.title, section_index: s.section_index })
    }
    return map
  }, [sectionsForNotes])

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

  // After payload load (and on every progress change), scroll the current
  // paragraph into view so reopening the book lands you where you left off
  // instead of at the chapter title. We target p[aria-current=true] specifically
  // because the chapter nav buttons in the side drawers also carry aria-current.
  const currentSectionIndex = payload?.state.current_section_index
  const currentParagraphIndex = payload?.state.current_paragraph_index
  useEffect(() => {
    if (currentSectionIndex === undefined || currentParagraphIndex === undefined) return
    const id = requestAnimationFrame(() => {
      const el = document.querySelector('article p[aria-current="true"]') as HTMLElement | null
      el?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
    return () => cancelAnimationFrame(id)
  }, [bookId, currentSectionIndex, currentParagraphIndex])

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
    <main
      data-reader-font={fontSize}
      className="min-h-screen bg-paper-50 text-ink-900 pt-[env(safe-area-inset-top)]"
    >
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
        <article
          className="px-6 sm:px-8 md:px-10 py-6"
          onTouchStart={(e) => {
            if (e.touches.length !== 1) return
            const t = e.touches[0]
            swipeStartRef.current = { x: t.clientX, y: t.clientY }
          }}
          onTouchEnd={(e) => {
            const start = swipeStartRef.current
            swipeStartRef.current = null
            if (!start || advancing) return
            const t = e.changedTouches[0]
            if (!t) return
            const dx = t.clientX - start.x
            const dy = t.clientY - start.y
            // 60px horizontal minimum, 40px vertical max — keeps vertical scrolls
            // and accidental taps from triggering page navigation.
            if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return
            if (dx < 0) {
              if (hasMoreInSection) {
                advance(state.current_section_index, nextParagraph)
              } else if (hasNextSection) {
                advance(state.current_section_index + 1, 0)
              }
            } else {
              if (canAdvance(state.current_section_index, state.current_paragraph_index - 1)) {
                advance(state.current_section_index, state.current_paragraph_index - 1)
              }
            }
          }}
        >
          {/* mobile 顶部工具栏：抽屉入口。sticky 让滚到正文中间也能看到回书架/章节/笔记按钮。 */}
          <div className="md:hidden sticky top-[env(safe-area-inset-top)] z-20 -mx-6 px-6 py-2 mb-4 flex items-center gap-2 border-b border-ink-500/15 bg-paper-50/95 backdrop-blur">
            <Link
              to="/shelf"
              className="text-xs text-sky-700 underline mr-auto"
              aria-label="回书架"
            >
              ← 书架
            </Link>
            <button
              type="button"
              onClick={() => setMobileDrawer('chapters')}
              aria-label="打开章节导航"
              className="text-xs px-2 py-1 border border-ink-500/30 rounded hover:bg-paper-100 transition-colors"
            >
              章节
            </button>
            <button
              type="button"
              onClick={() => setMobileDrawer('notes')}
              aria-label={`打开笔记栏${notes.length > 0 ? `，共 ${notes.length} 条` : ''}`}
              className="text-xs px-2 py-1 border border-ink-500/30 rounded hover:bg-paper-100 transition-colors"
            >
              笔记
              {notes.length > 0 && (
                <span className="ml-1 text-ink-500">({notes.length})</span>
              )}
            </button>
            <ReaderControls />
          </div>

          {/* desktop: 阅读设置浮在阅读区右上角 */}
          <div className="hidden md:flex justify-end mb-2">
            <ReaderControls />
          </div>

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
            <div className="reading mx-auto pb-32 max-w-2xl">
              <h2 className="font-serif text-2xl mb-6">{currentSection.title}</h2>
              {currentSection.paragraphs
                .slice(0, state.current_paragraph_index + 1)
                .map((paragraph, idx) => {
                  const isCurrent = idx === state.current_paragraph_index
                  const isComposerHere = composerParagraphIdx === idx
                  return (
                    <div key={`${currentSection.id}-${idx}`}>
                      <p
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`mb-2 transition-colors ${
                          isCurrent
                            ? 'border-l-2 border-lamp-500 pl-4 text-ink-900'
                            : 'text-ink-700'
                        }`}
                      >
                        {paragraph}
                      </p>
                      {!isComposerHere && (
                        <div className="flex justify-end mb-4">
                          <button
                            type="button"
                            onClick={() => setComposerParagraphIdx(idx)}
                            aria-label={`为第 ${idx + 1} 段添加笔记`}
                            className="text-xs px-2.5 py-1 border border-ink-500/20 text-ink-500 hover:text-sky-700 hover:border-sky-700/40 rounded transition-colors"
                          >
                            + 添加笔记
                          </button>
                        </div>
                      )}
                      {isComposerHere && bookId && (
                        <NoteComposer
                          bookId={bookId}
                          sectionId={currentSection.id}
                          paragraphIndex={idx}
                          onSaved={(note) => {
                            setNotes((prev) => [...prev, note])
                            setComposerParagraphIdx(null)
                          }}
                          onCancel={() => setComposerParagraphIdx(null)}
                        />
                      )}
                    </div>
                  )
                })}
              {hasMoreInSection && (
                <p
                  aria-hidden="true"
                  className="text-center text-xs text-ink-500/60 mt-6 select-none"
                >
                  …下一段未解锁，点底部"下一段"继续
                </p>
              )}
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
            bookTitle={book.title}
          />
        </aside>
      </div>

      {/* mobile 抽屉 */}
      {mobileDrawer && (
        <div
          className="md:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={mobileDrawer === 'chapters' ? '章节导航' : '读书笔记栏'}
        >
          <button
            type="button"
            onClick={() => setMobileDrawer(null)}
            aria-label="关闭"
            className="absolute inset-0 bg-ink-900/40 cursor-default"
            tabIndex={-1}
          />
          <div
            className={`absolute top-0 bottom-0 w-[85%] max-w-sm bg-paper-50 overflow-y-auto p-4 shadow-xl ${
              mobileDrawer === 'chapters'
                ? 'left-0 border-r border-ink-500/15'
                : 'right-0 border-l border-ink-500/15'
            }`}
          >
            <button
              type="button"
              onClick={() => setMobileDrawer(null)}
              aria-label="关闭抽屉"
              className="absolute top-2 right-2 text-ink-500 hover:text-ink-700 text-xl leading-none p-2"
            >
              ×
            </button>
            {mobileDrawer === 'chapters' ? (
              <div className="mt-8">
                <h2 className="text-sm font-medium text-ink-700 mb-3">
                  {book.title}
                </h2>
                {book.author && (
                  <p className="text-xs text-ink-500 mb-4">{book.author}</p>
                )}
                <nav aria-label="章节列表">
                  <ul className="space-y-1">
                    {sections.map((section) => {
                      const unlocked = isUnlocked(section.section_index)
                      const isCurrent =
                        section.section_index === state.current_section_index
                      return (
                        <li key={section.id}>
                          <button
                            type="button"
                            disabled={!unlocked || advancing}
                            onClick={() => {
                              advance(section.section_index, 0)
                              setMobileDrawer(null)
                            }}
                            aria-label={`跳转到${section.title}${unlocked ? '' : '，未解锁'}`}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={`block w-full text-left text-sm px-2 py-2 rounded transition-colors ${
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
              </div>
            ) : (
              <div className="mt-8">
                <NotesPanel
                  notes={notes}
                  loading={notesLoading}
                  error={notesError}
                  sectionsById={sectionsById}
                  bookTitle={book.title}
                />
              </div>
            )}
          </div>
        </div>
      )}
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
