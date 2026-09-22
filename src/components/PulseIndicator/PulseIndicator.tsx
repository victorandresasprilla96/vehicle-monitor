import type { DeviceStatus } from '../../api/types'
import styles from './PulseIndicator.module.css'

/**
 * Connection dot: a live vehicle "breathes" (expanding ring), offline and
 * unknown stay still. Decorative: the status is always spelled out next to it.
 */
export function PulseIndicator({ status }: { status: DeviceStatus }) {
  return <span className={styles.pulse} data-status={status} aria-hidden="true" />
}
