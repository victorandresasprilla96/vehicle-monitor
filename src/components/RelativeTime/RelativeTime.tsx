import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { formatTimestamp } from '../../utils/format'
import { ageSeconds, formatRelative, OLD_DATA_SECONDS } from '../../utils/relativeTime'
import styles from './RelativeTime.module.css'

const TICK_MS = 1000

interface RelativeTimeProps {
  iso: string
  /** Just "hace 10 s" (lists) */
  compact?: boolean
}

/**
 * "● Hace 10 s · 19:25:07" — freshness dot, relative age and exact time.
 * Owns its own 1 s clock, so only this text re-renders every second — not the card.
 * Past OLD_DATA_SECONDS the dot and text turn amber and "(datos antiguos)" is spoken.
 */
export function RelativeTime({ iso, compact = false }: RelativeTimeProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const old = ageSeconds(iso, now) > OLD_DATA_SECONDS
  const relative = formatRelative(iso, now)

  if (compact) {
    return (
      <time dateTime={iso} className={styles.compact} data-old={old || undefined}>
        {relative.charAt(0).toLowerCase() + relative.slice(1)}
      </time>
    )
  }

  return (
    <time dateTime={iso} className={clsx(styles.time)} data-old={old || undefined}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.relative}>
        {relative}
        {old && <span className="sr-only"> (datos antiguos)</span>}
      </span>
      <span className={styles.absolute}>
        <span aria-hidden="true"> · </span>
        {formatTimestamp(iso)}
      </span>
    </time>
  )
}
