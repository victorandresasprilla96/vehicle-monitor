import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  /** true when the theme was chosen explicitly (not following the OS) */
  isExplicit: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// Keep in sync with the inline script in index.html
export const THEME_STORAGE_KEY = 'vm-theme'
export const THEME_COLOR: Record<Theme, string> = { light: '#f3f5f8', dark: '#0a0e13' }

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode / storage disabled: the choice just won't persist.
  }
}

export function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
