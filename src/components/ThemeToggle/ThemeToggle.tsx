import { useTheme } from '../../hooks/useTheme'
import styles from './ThemeToggle.module.css'

/**
 * Light/dark switch. Uses role="switch" so screen readers announce
 * "Modo oscuro, interruptor, activado/desactivado"; the name stays constant
 * and only the checked state changes. Native <button> gives Space/Enter.
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
    >
      <span className={styles.label}>Modo oscuro</span>
      <span className={styles.track} aria-hidden="true">
        <SunIcon className={styles.iconSun} />
        <MoonIcon className={styles.iconMoon} />
        <span className={styles.thumb} />
      </span>
    </button>
  )
}

function SunIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="12" height="12" fill="none">
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
      </g>
    </svg>
  )
}

function MoonIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="12" height="12">
      <path
        fill="currentColor"
        d="M13.5 10.2A5.8 5.8 0 0 1 5.8 2.5a.5.5 0 0 0-.66-.6A6.5 6.5 0 1 0 14.1 10.86a.5.5 0 0 0-.6-.66Z"
      />
    </svg>
  )
}
