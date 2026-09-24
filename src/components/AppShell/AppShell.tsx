import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { SIDE_BY_SIDE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { BottomSheet } from '../BottomSheet/BottomSheet'
import { BrandMark } from '../BrandMark/BrandMark'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './AppShell.module.css'
import { MapInsetContext, type MapInsets } from './layoutContext'

interface AppShellProps {
  /** Side panel (fleet list) — or, on mobile, the bottom sheet content */
  panel: ReactNode
  /** Map region */
  map: ReactNode
  /** Header items before the theme switch (e.g. fleet status pill) */
  actions?: ReactNode
  /** Header items after the theme switch (account menu) */
  account?: ReactNode
  /** Floating card over the map, beside the side panel (desktop layout only) */
  mapOverlay?: ReactNode
  /** Side panel + overlay hidden to give the whole width to the map */
  collapsed?: boolean
  onExpand?: () => void
}

export const PANEL_ID = 'vehicle-panel'

export function AppShell({
  panel,
  map,
  actions,
  account,
  mapOverlay,
  collapsed: collapsedPref = false,
  onExpand,
}: AppShellProps) {
  const sideBySide = useMediaQuery(SIDE_BY_SIDE_QUERY)
  // Collapsing only exists beside the map; stacked layouts always show the panel.
  const collapsed = sideBySide && collapsedPref
  // Map area covered by the mobile bottom sheet (0 beside the panel)
  const [sheetInset, setSheetInset] = useState(0)
  const showOverlay = sideBySide && !collapsed && Boolean(mapOverlay)

  // Measured width of the floating card (+ its left margin): the map centres
  // the vehicle in the part to its right.
  const overlayRef = useRef<HTMLDivElement>(null)
  const [overlayWidth, setOverlayWidth] = useState(0)
  useEffect(() => {
    const el = overlayRef.current
    if (!showOverlay || !el) return
    const observer = new ResizeObserver(() => setOverlayWidth(el.offsetLeft + el.offsetWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [showOverlay])

  const insets: MapInsets = {
    bottom: sideBySide ? 0 : sheetInset,
    left: showOverlay ? overlayWidth : 0,
  }

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
          {/* Subtitle outside the h1: inside, screen readers read
              "Monitor de flotaCentral de operaciones" as one run-on heading */}
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Monitor de flota</h1>
            <p className={styles.subtitle}>Central de operaciones</p>
          </div>
        </div>
        <div className={styles.actions}>
          {actions}
          <ThemeToggle />
          {account && (
            <>
              <span className={styles.divider} aria-hidden="true" />
              {account}
            </>
          )}
        </div>
      </header>

      <main
        className={styles.main}
        data-layout={sideBySide ? 'side' : 'sheet'}
        data-collapsed={collapsed || undefined}
        style={
          {
            '--map-inset-bottom': `${insets.bottom}px`,
            '--map-inset-left': `${insets.left}px`,
          } as CSSProperties
        }
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
          {showOverlay && (
            <div ref={overlayRef} className={styles.overlay}>
              {mapOverlay}
            </div>
          )}
          {/* Collapsed: disclosure to bring the panel back (constant name, aria-expanded) */}
          {collapsed && (
            <button
              type="button"
              className={styles.restore}
              aria-expanded="false"
              aria-controls={PANEL_ID}
              onClick={onExpand}
            >
              <PanelIcon />
              <span>Panel del vehículo</span>
            </button>
          )}
          <MapInsetContext value={insets}>{map}</MapInsetContext>
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
      <rect x="2.5" y="3" width="15" height="14" rx="2.5" />
      <path d="M7.5 3v14M11 7.5 13.5 10 11 12.5" />
    </svg>
  )
}
