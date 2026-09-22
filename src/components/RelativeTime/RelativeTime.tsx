import { useEffect, useState } from 'react'
import { formatTimestamp } from '../../utils/format'
import { ageSeconds, formatRelative, OLD_DATA_SECONDS } from '../../utils/relativeTime'
import styles from './RelativeTime.module.css'

const TICK_MS = 1000

/**
 * "Hace 12 segundos" over the exact "14:32:01".
 * Owns its own 1 s clock, so only this text re-renders every second — not the card.
 * Turns amber once data is older than OLD_DATA_SECONDS.
 */
export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const old = ageSeconds(iso, now) > OLD_DATA_SECONDS

  return (
    <time dateTime={iso} className={styles.time} data-old={old || undefined}>
      <span className={styles.relative}>
        {formatRelative(iso, now)}
        {old && <span className="sr-only"> (datos antiguos)</span>}
      </span>
      <span className={styles.absolute}>{formatTimestamp(iso)}</span>
    </time>
  )
}
