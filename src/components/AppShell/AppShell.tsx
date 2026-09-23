import { useState, type CSSProperties, type ReactNode } from 'react'
import { SIDE_BY_SIDE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { BottomSheet } from '../BottomSheet/BottomSheet'
import { BrandMark } from '../BrandMark/BrandMark'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './AppShell.module.css'
import { MapInsetContext } from './layoutContext'

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
  // Map area covered by the mobile bottom sheet (0 beside the panel)
  const [sheetInset, setSheetInset] = useState(0)
  const mapInset = sideBySide ? 0 : sheetInset

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

      <main
        className={styles.main}
        data-layout={sideBySide ? 'side' : 'sheet'}
        data-collapsed={collapsed || undefined}
        style={{ '--map-inset-bottom': `${mapInset}px` } as CSSProperties}
      >
        {/* One component in both layouts (sheet on mobile, side panel otherwise):
            rotating the phone switches mode without remounting the panel. */}
        <BottomSheet
          id={PANEL_ID}
          label="Estado del vehículo"
          enabled={!sideBySide}
          className={styles.panel}
          hidden={collapsed}
          onInsetChange={setSheetInset}
        >
          {panel}
        </BottomSheet>
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
          <MapInsetContext value={mapInset}>{map}</MapInsetContext>
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
