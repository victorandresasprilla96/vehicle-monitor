import styles from './MapSkeleton.module.css'

/**
 * Fills the map region at its final size from the first frame, so the map
 * replaces it in place. A soft locating pulse hints at what's coming.
 * `slow` swaps in an explanation; it's centered and absolutely positioned,
 * so the change never moves anything else on screen.
 */
export function MapSkeleton({ slow = false }: { slow?: boolean }) {
  return (
    <div className={styles.mapSkeleton} aria-hidden="true">
      <div className={styles.locator}>
        <span className={styles.ring} />
        <span className={styles.dot} />
      </div>
      {slow ? (
        <p key="slow" className={styles.label}>
          <strong className={styles.slowTitle}>Está tardando más de lo habitual</strong>
          <span>El servidor responde despacio. Seguimos intentándolo…</span>
        </p>
      ) : (
        <p key="loading" className={styles.label}>
          Cargando mapa…
        </p>
      )}
    </div>
  )
}
