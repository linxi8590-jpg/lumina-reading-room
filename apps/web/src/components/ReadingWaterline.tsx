interface ReadingWaterlineProps {
  currentSectionIndex: number
  currentParagraphIndex: number
  unlockedSectionIndex: number
  unlockedParagraphIndex: number
  totalSections: number
  totalParagraphsInBook: number
  unlockedParagraphCount: number
  currentSectionTitle: string | null
}

export default function ReadingWaterline({
  currentSectionIndex,
  unlockedSectionIndex,
  totalSections,
  totalParagraphsInBook,
  unlockedParagraphCount,
  currentSectionTitle,
}: ReadingWaterlineProps) {
  const percent =
    totalParagraphsInBook > 0
      ? Math.min(
          100,
          Math.round((unlockedParagraphCount / totalParagraphsInBook) * 100),
        )
      : 0

  const label = `阅读进度，已读到第 ${unlockedSectionIndex + 1} 章，共 ${totalSections} 章，已读 ${percent}%`

  return (
    <div className="sticky top-0 bg-paper-50/95 backdrop-blur py-3 mb-4 z-10 border-b border-ink-500/10">
      <div className="flex items-center justify-between gap-3 mb-2 text-xs text-ink-500">
        <span>
          第 {currentSectionIndex + 1} 章 / 共 {totalSections} 章
          {currentSectionTitle ? ` · ${currentSectionTitle}` : ''}
        </span>
        <span aria-hidden="true">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 bg-paper-100 rounded overflow-hidden"
      >
        <div
          className="h-full bg-lamp-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
