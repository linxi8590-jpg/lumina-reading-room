import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type FontSize = 'small' | 'medium' | 'large'
export type Theme = 'light' | 'dark'

const FONT_VALUES: FontSize[] = ['small', 'medium', 'large']
const THEME_VALUES: Theme[] = ['light', 'dark']

function isFontSize(value: string): value is FontSize {
  return (FONT_VALUES as string[]).includes(value)
}

function isTheme(value: string): value is Theme {
  return (THEME_VALUES as string[]).includes(value)
}

export function useReaderPrefs() {
  const [fontRaw, setFont] = useLocalStorage('lumina.fontSize', 'medium')
  const [themeRaw, setTheme] = useLocalStorage('lumina.theme', 'light')

  const fontSize: FontSize = isFontSize(fontRaw) ? fontRaw : 'medium'
  const theme: Theme = isTheme(themeRaw) ? themeRaw : 'light'

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
    return () => {
      // Don't strip on unmount: the theme should persist across the app.
    }
  }, [theme])

  return {
    fontSize,
    setFontSize: (value: FontSize) => setFont(value),
    theme,
    setTheme: (value: Theme) => setTheme(value),
  }
}
