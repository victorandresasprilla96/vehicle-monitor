import { useState, type ReactNode } from 'react'
import styles from './AnimatedValue.module.css'

interface AnimatedValueProps<T> {
  /** Compared with the previous render to detect a change */
  value: T
  children: ReactNode
  /**
   * Whether a change deserves the colour highlight (not just the soft fade-in).
   * e.g. speed: only when it moved ≥ 5 km/h, so a car in traffic doesn't blink every poll.
   */
  highlightWhen?: (previous: T, next: T) => boolean
}

/**
 * Soft fade-in on every change, plus a brief highlight that fades out for
 * significant ones: guides the operator's eye without pulling it every poll.
 * The inner span is re-keyed per change, which restarts the CSS animation
 * (no timers, no layout change: the highlight is a pseudo-element behind the text).
 */
export function AnimatedValue<T>({
  value,
  children,
  highlightWhen = () => true,
}: AnimatedValueProps<T>) {
  const [previous, setPrevious] = useState(value)
  const [change, setChange] = useState({ count: 0, highlight: false })

  if (!Object.is(value, previous)) {
    setPrevious(value)
    setChange((c) => ({ count: c.count + 1, highlight: highlightWhen(previous, value) }))
  }

  return (
    <span
      key={change.count}
      className={styles.value}
      data-changed={change.count > 0 || undefined}
      data-highlight={(change.count > 0 && change.highlight) || undefined}
    >
      {children}
    </span>
  )
}
