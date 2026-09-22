import type { ReactNode } from 'react'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './AppShell.module.css'

interface AppShellProps {
  /** Vehicle selector + status card */
  panel: ReactNode
  /** Map region */
  map: ReactNode
  /** Extra header actions (e.g. logout), rendered before the theme switch */
  actions?: ReactNode
}

export function AppShell({ panel, map, actions }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a href="#vehicle-panel" className="skip-link">
        Saltar al estado del vehículo
      </a>

      <header className={styles.header}>
        <div className={styles.brand}>
          <BrandMark />
          <h1 className={styles.title}>
            Monitor de flota
            <span className={styles.subtitle}>Central de operaciones</span>
          </h1>
        </div>
        <div className={styles.actions}>
          {actions}
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <aside
          id="vehicle-panel"
          className={styles.panel}
          aria-label="Estado del vehículo"
          tabIndex={-1}
        >
          {panel}
        </aside>
        <section className={styles.map} aria-label="Mapa">
          {map}
        </section>
      </main>
    </div>
  )
}

function BrandMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
      <path d="M16 7 23 24l-7-3.6L9 24Z" fill="var(--color-on-accent)" />
    </svg>
  )
}
