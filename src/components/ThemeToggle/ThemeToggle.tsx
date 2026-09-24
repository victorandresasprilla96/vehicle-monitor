import { useTheme } from '../../hooks/useTheme'
import styles from './ThemeToggle.module.css'

/**
 * Light/dark switch as a compact icon button. Keeps role="switch" so screen
 * readers announce "Modo oscuro, interruptor, activado/desactivado"; the name
 * stays constant (visually hidden) and only the checked state changes.
 * The icon shows the theme you'd switch *to* (moon in light, sun in dark).
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      className={styles.toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <span className="sr-only">Modo oscuro</span>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M20 14.6A8.2 8.2 0 0 1 9.4 4a.6.6 0 0 0-.8-.7A8.9 8.9 0 1 0 20.7 15.4a.6.6 0 0 0-.7-.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}
