import { useState } from 'react'
import type { NoteType, ReadingNote } from './NoteBubble'
import { api } from '../lib/api'

const NOTE_TYPE_CHOICES: { value: NoteType; label: string; hint: string }[] = [
  { value: 'reflection', label: '感受', hint: '读到这里想到了什么' },
  { value: 'highlight', label: '重点', hint: '这一段的核心信息' },
  { value: 'quote', label: '金句', hint: '一句话值得保存' },
  { value: 'question', label: '疑问', hint: '想继续琢磨的问题' },
  { value: 'review_card', label: '复习卡', hint: '问题一行 + 回车 + 答案' },
]

interface NoteComposerProps {
  bookId: string
  sectionId: string
  paragraphIndex: number
  onSaved: (note: ReadingNote) => void
  onCancel: () => void
}

export default function NoteComposer({
  bookId,
  sectionId,
  paragraphIndex,
  onSaved,
  onCancel,
}: NoteComposerProps) {
  const [noteType, setNoteType] = useState<NoteType>('reflection')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!content.trim()) {
      setError('笔记内容不能为空')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post<{ note: ReadingNote }>(
        `/api/books/${bookId}/notes`,
        {
          section_id: sectionId,
          paragraph_index: paragraphIndex,
          note_type: noteType,
          content: content.trim(),
          author_type: 'user',
        },
      )
      onSaved(res.note)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-label="写一条笔记"
      className="mt-3 mb-6 bg-paper-100 border border-ink-500/15 rounded-lg p-3"
    >
      <fieldset className="mb-2">
        <legend className="sr-only">笔记类型</legend>
        <div role="radiogroup" aria-label="笔记类型" className="flex flex-wrap gap-1">
          {NOTE_TYPE_CHOICES.map((choice) => {
            const active = noteType === choice.value
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${choice.label}：${choice.hint}`}
                onClick={() => setNoteType(choice.value)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  active
                    ? 'bg-lamp-500 text-ink-900'
                    : 'text-ink-500 border border-ink-500/20 hover:bg-paper-50'
                }`}
              >
                {choice.label}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-ink-500 mt-1">
          {NOTE_TYPE_CHOICES.find((c) => c.value === noteType)?.hint}
        </p>
      </fieldset>

      <label className="block">
        <span className="sr-only">笔记内容</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="写点什么…"
          autoFocus
          className="w-full bg-paper-50 border border-ink-500/20 rounded px-2 py-1 text-sm font-serif leading-relaxed"
        />
      </label>

      {error && (
        <p className="text-xs text-red-500 mt-1" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label="取消"
          className="px-3 py-1 text-xs border border-ink-500/30 rounded hover:bg-paper-50 disabled:opacity-40 transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || !content.trim()}
          aria-label="保存笔记"
          className="px-3 py-1 text-xs bg-lamp-500 text-ink-900 rounded font-medium hover:bg-lamp-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}
