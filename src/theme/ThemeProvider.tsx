import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  THEME_COLOR,
  ThemeContext,
  readStoredTheme,
  storeTheme,
  systemTheme,
  type Theme,
} from './theme'

const TRANSITION_CLASS = 'theme-transition'
const TRANSITION_MS = 450

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [explicit, setExplicit] = useState<Theme | null>(readStoredTheme)
  const [system, setSystem] = useState<Theme>(systemTheme)
  const theme = explicit ?? system
  const transitionTimer = useRef<number | undefined>(undefined)
  const isFirstRender = useRef(true)

  // Follow OS changes while the user hasn't picked a theme explicitly.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    // The inline script already applied the initial theme; only animate real changes.
    if (isFirstRender.current) {
      isFirstRender.current = false
      applyTheme(theme)
      return
    }
    const root = document.documentElement
    root.classList.add(TRANSITION_CLASS)
    applyTheme(theme)
    window.clearTimeout(transitionTimer.current)
    transitionTimer.current = window.setTimeout(
      () => root.classList.remove(TRANSITION_CLASS),
      TRANSITION_MS,
    )
  }, [theme])

  useEffect(() => () => window.clearTimeout(transitionTimer.current), [])

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next)
    setExplicit(next)
  }, [])

  const toggleTheme = useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [setTheme, theme],
  )

  const value = useMemo(
    () => ({ theme, isExplicit: explicit !== null, setTheme, toggleTheme }),
    [theme, explicit, setTheme, toggleTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
