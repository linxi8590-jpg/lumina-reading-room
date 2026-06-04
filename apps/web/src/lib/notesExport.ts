import type { NoteType, ReadingNote } from '../components/NoteBubble'

const TYPE_LABELS: Record<NoteType, string> = {
  reflection: '感受',
  highlight: '重点',
  quote: '金句',
  question: '疑问',
  review_card: '复习卡',
}

interface ExportOptions {
  bookTitle: string
  notes: ReadingNote[]
  sectionsById?: Map<string, { title: string; section_index: number }>
}

export function notesToMarkdown({
  bookTitle,
  notes,
  sectionsById,
}: ExportOptions): string {
  const lines: string[] = []
  lines.push(`# ${bookTitle} · 读书笔记`)
  lines.push('')
  lines.push(
    `> 共 ${notes.length} 条笔记，导出于 ${new Date().toLocaleString()}。`,
  )
  lines.push('')

  const groups = new Map<string, ReadingNote[]>()
  for (const note of notes) {
    const key = note.section_id || '__no_section__'
    const list = groups.get(key)
    if (list) {
      list.push(note)
    } else {
      groups.set(key, [note])
    }
  }

  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const aIdx =
      sectionsById?.get(a[0])?.section_index ?? Number.MAX_SAFE_INTEGER
    const bIdx =
      sectionsById?.get(b[0])?.section_index ?? Number.MAX_SAFE_INTEGER
    return aIdx - bIdx
  })

  for (const [sectionId, sectionNotes] of sortedGroups) {
    const section = sectionsById?.get(sectionId)
    const heading = section
      ? `第 ${section.section_index + 1} 章 · ${section.title}`
      : '未关联章节'
    lines.push(`## ${heading}`)
    lines.push('')

    for (const note of sectionNotes) {
      const author =
        note.author_type === 'ai' ? note.model_name || 'AI' : '你'
      const type = TYPE_LABELS[note.note_type]
      const timestamp = formatTimestamp(note.created_at)
      lines.push(`### ${author} · ${type}`)
      lines.push('')

      if (note.note_type === 'quote') {
        const quoted = note.content
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n')
        lines.push(quoted)
      } else if (note.note_type === 'review_card') {
        const firstNewline = note.content.indexOf('\n')
        if (firstNewline !== -1) {
          const question = note.content.slice(0, firstNewline).trim()
          const answer = note.content.slice(firstNewline + 1).trim()
          lines.push(`**Q:** ${question}`)
          lines.push('')
          lines.push(`**A:** ${answer}`)
        } else {
          lines.push(note.content)
        }
      } else {
        lines.push(note.content)
      }

      lines.push('')
      if (timestamp) {
        lines.push(`<sub>${timestamp}</sub>`)
        lines.push('')
      }
    }
  }

  return lines.join('\n').trimEnd() + '\n'
}

function formatTimestamp(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function safeFilename(input: string): string {
  return (
    input
      .replace(/[^\p{L}\p{N}一-龥_\-]+/gu, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'lumina'
  )
}
