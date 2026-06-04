import { useState } from 'react'
import {
  useReaderPrefs,
  type FontSize,
  type Theme,
} from '../lib/useReaderPrefs'

const FONT_CHOICES: { value: FontSize; label: string; aria: string }[] = [
  { value: 'small', label: '小', aria: '字号小' },
  { value: 'medium', label: '中', aria: '字号中' },
  { value: 'large', label: '大', aria: '字号大' },
]

const THEME_CHOICES: { value: Theme; label: string }[] = [
  { value: 'light', label: '日间' },
  { value: 'dark', label: '夜间' },
]

export default function ReaderControls() {
  const { fontSize, setFontSize, theme, setTheme } = useReaderPrefs()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="阅读设置：字号、主题"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="text-xs px-2 py-1 border border-ink-500/30 rounded hover:bg-paper-100 transition-colors font-serif"
      >
        Aa
      </button>

      {open && (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="关闭阅读设置"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div
            role="dialog"
            aria-label="阅读设置"
            className="absolute right-0 top-full mt-1 z-50 w-60 bg-paper-50 border border-ink-500/15 rounded-lg shadow-lg p-4"
          >
            <fieldset className="mb-4">
              <legend className="text-xs text-ink-500 mb-2">字号</legend>
              <div role="radiogroup" aria-label="字号" className="flex gap-1">
                {FONT_CHOICES.map((choice) => {
                  const active = fontSize === choice.value
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={choice.aria}
                      onClick={() => setFontSize(choice.value)}
                      className={`flex-1 text-sm px-2 py-1 rounded transition-colors ${
                        active
                          ? 'bg-lamp-500 text-ink-900'
                          : 'text-ink-700 border border-ink-500/20 hover:bg-paper-100'
                      }`}
                    >
                      {choice.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs text-ink-500 mb-2">主题</legend>
              <div role="radiogroup" aria-label="主题" className="flex gap-1">
                {THEME_CHOICES.map((choice) => {
                  const active = theme === choice.value
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`切换到${choice.label}模式`}
                      onClick={() => setTheme(choice.value)}
                      className={`flex-1 text-sm px-2 py-1 rounded transition-colors ${
                        active
                          ? 'bg-lamp-500 text-ink-900'
                          : 'text-ink-700 border border-ink-500/20 hover:bg-paper-100'
                      }`}
                    >
                      {choice.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </div>
        </>
      )}
    </div>
  )
}
