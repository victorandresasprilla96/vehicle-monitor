import { useState, type ReactNode } from 'react'
import { SIDE_BY_SIDE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { BrandMark } from '../BrandMark/BrandMark'
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

const PANEL_ID = 'vehicle-panel'

export function AppShell({ panel, map, actions }: AppShellProps) {
  const sideBySide = useMediaQuery(SIDE_BY_SIDE_QUERY)
  const [collapsedPref, setCollapsedPref] = useState(false)
  // Collapsing only exists beside the map; stacked layouts always show the panel.
  const collapsed = sideBySide && collapsedPref

  return (
    <div className={styles.shell}>
      {!collapsed && (
        <a href={`#${PANEL_ID}`} className="skip-link">
          Saltar al estado del vehículo
        </a>
      )}

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

      <main className={styles.main} data-collapsed={collapsed || undefined}>
        <aside
          id={PANEL_ID}
          className={styles.panel}
          aria-label="Estado del vehículo"
          tabIndex={-1}
          hidden={collapsed}
        >
          {panel}
        </aside>
        <section className={styles.map} aria-label="Mapa">
          {/* Disclosure for the panel: constant name, state in aria-expanded */}
          {sideBySide && (
            <button
              type="button"
              className={styles.panelToggle}
              aria-expanded={!collapsed}
              aria-controls={PANEL_ID}
              onClick={() => setCollapsedPref((c) => !c)}
            >
              <PanelIcon />
              <span>Panel del vehículo</span>
            </button>
          )}
          {map}
        </section>
      </main>
    </div>
  )
}

function PanelIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M7.5 3.5v13M13 8l-2 2 2 2" />
    </svg>
  )
}
