import { useState } from 'react'

interface CopyButtonProps {
  value: string
  label: string
  disabled?: boolean
}

export default function CopyButton({ value, label, disabled }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  async function handleCopy() {
    if (disabled || !value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setError(false)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled || !value}
        aria-label={`拷贝${label}`}
        className="px-3 py-1 text-sm border border-ink-500/30 rounded hover:bg-paper-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {copied ? '已拷贝' : error ? '拷贝失败' : '拷贝'}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? `已拷贝${label}` : error ? `拷贝${label}失败` : ''}
      </span>
    </>
  )
}
