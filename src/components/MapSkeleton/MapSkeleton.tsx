import styles from './MapSkeleton.module.css'

/**
 * Fills the map region at its final size from the first frame, so the map
 * replaces it in place. A soft locating pulse hints at what's coming.
 */
export function MapSkeleton({ label = 'Cargando mapa…' }: { label?: string }) {
  return (
    <div className={styles.mapSkeleton} aria-hidden="true">
      <div className={styles.locator}>
        <span className={styles.ring} />
        <span className={styles.dot} />
      </div>
      <p className={styles.label}>{label}</p>
    </div>
  )
}
