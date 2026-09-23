import type { DeviceStatus } from '../../api/types'
import styles from './PulseIndicator.module.css'

/**
 * Connection dot: a live vehicle "breathes" (expanding ring), offline and
 * unknown stay still. Decorative: the status is always spelled out next to it.
 * The pulse runs 2 cycles (4 s) when the status becomes online, then rests:
 * WCAG 2.2.2 — nothing moves automatically for more than 5 s.
 */
export function PulseIndicator({ status }: { status: DeviceStatus }) {
  // Keyed by status: a status change remounts the dot, replaying the (finite) pulse
  return <span key={status} className={styles.pulse} data-status={status} aria-hidden="true" />
}
