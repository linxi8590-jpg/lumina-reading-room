import { useEffect, useState } from 'react'

export function useLocalStorage(key: string, initial: string) {
  const [value, setValue] = useState<string>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const stored = window.localStorage.getItem(key)
      return stored !== null ? stored : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // localStorage may be disabled (private mode, quota). Silently ignore.
    }
  }, [key, value])

  return [value, setValue] as const
}
