export type NoteAuthorType = 'user' | 'ai'
export type NoteType =
  | 'reflection'
  | 'highlight'
  | 'quote'
  | 'question'
  | 'review_card'

export interface ReadingNote {
  id: string
  book_id: string
  section_id: string | null
  paragraph_index: number | null
  author_type: NoteAuthorType
  note_type: NoteType
  content: string
  model_name: string | null
  created_at: string
  updated_at: string
}

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  reflection: '感受',
  highlight: '重点',
  quote: '金句',
  question: '疑问',
  review_card: '复习卡',
}

interface NoteBubbleProps {
  note: ReadingNote
}

export default function NoteBubble({ note }: NoteBubbleProps) {
  const isAi = note.author_type === 'ai'
  const typeLabel = NOTE_TYPE_LABELS[note.note_type]
  const authorLabel = isAi
    ? note.model_name
      ? `${note.model_name} 写的${typeLabel}`
      : `AI 写的${typeLabel}`
    : `你写的${typeLabel}`

  const wrapperBase = 'mb-3 rounded text-sm leading-relaxed'
  const wrapperByAuthor = isAi
    ? 'bg-lamp-200/40 border border-lamp-200'
    : 'border border-ink-500/15'

  if (note.note_type === 'quote') {
    return (
      <article
        aria-label={authorLabel}
        className={`${wrapperBase} ${isAi ? 'bg-lamp-200/40' : 'bg-paper-100'} p-4 text-center italic relative`}
      >
        <span aria-hidden="true" className="absolute top-1 left-2 text-lg text-ink-500/60 font-serif">
          “
        </span>
        <NoteHeader authorLabel={authorLabel} isAi={isAi} model={note.model_name} type={typeLabel} />
        <p className="text-ink-900 my-2 font-serif">{note.content}</p>
        <NoteTimestamp createdAt={note.created_at} />
      </article>
    )
  }

  if (note.note_type === 'review_card') {
    return (
      <article
        aria-label={authorLabel}
        className={`${wrapperBase} ${wrapperByAuthor} p-3`}
      >
        <NoteHeader authorLabel={authorLabel} isAi={isAi} model={note.model_name} type={typeLabel} />
        <details className="mt-1">
          <summary className="cursor-pointer text-ink-700 font-medium select-none">
            {firstLine(note.content)}
          </summary>
          <div className="mt-2 text-ink-700 whitespace-pre-wrap">
            {restAfterFirstLine(note.content)}
          </div>
        </details>
        <NoteTimestamp createdAt={note.created_at} />
      </article>
    )
  }

  const accentClass =
    note.note_type === 'highlight'
      ? 'border-l-4 border-l-lamp-500'
      : note.note_type === 'question'
        ? 'border-l-4 border-l-sky-500'
        : ''

  return (
    <article
      aria-label={authorLabel}
      className={`${wrapperBase} ${wrapperByAuthor} ${accentClass} p-3`}
    >
      <NoteHeader authorLabel={authorLabel} isAi={isAi} model={note.model_name} type={typeLabel} />
      <p className="text-ink-700 whitespace-pre-wrap mt-1">{note.content}</p>
      <NoteTimestamp createdAt={note.created_at} />
    </article>
  )
}

interface NoteHeaderProps {
  authorLabel: string
  isAi: boolean
  model: string | null
  type: string
}

function NoteHeader({ authorLabel, isAi, model, type }: NoteHeaderProps) {
  return (
    <header className="flex items-center gap-2 text-xs text-ink-500">
      {isAi && (
        <span aria-hidden="true" title="AI 笔记" className="text-lamp-500">
          ✦
        </span>
      )}
      <span className="sr-only">{authorLabel}</span>
      <span aria-hidden="true" className="font-medium text-ink-700">
        {isAi ? (model || 'AI') : '你'}
      </span>
      <span aria-hidden="true">·</span>
      <span aria-hidden="true">{type}</span>
    </header>
  )
}

function NoteTimestamp({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt)
  const valid = !Number.isNaN(date.getTime())
  if (!valid) return null
  return (
    <p className="text-[10px] text-ink-500/60 mt-2" aria-hidden="true">
      {date.toLocaleString()}
    </p>
  )
}

function firstLine(content: string) {
  const idx = content.indexOf('\n')
  if (idx === -1) return content
  return content.slice(0, idx).trim()
}

function restAfterFirstLine(content: string) {
  const idx = content.indexOf('\n')
  if (idx === -1) return ''
  return content.slice(idx + 1).trim()
}
