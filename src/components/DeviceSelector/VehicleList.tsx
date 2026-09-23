import { useId } from 'react'
import type { Device } from '../../api/types'
import { STATUS_LABEL } from '../../utils/status'
import { PulseIndicator } from '../PulseIndicator/PulseIndicator'
import { Skeleton } from '../Skeleton/Skeleton'
import styles from './VehicleList.module.css'

interface VehicleListProps {
  devices: Device[]
  selectedId: number | null
  onChange: (id: number) => void
}

/** Small fleets are shown as a list: every vehicle's status is visible at a glance. */
export const VEHICLE_LIST_MAX = 6

/**
 * Native radio group styled as cards. Keyboard behaviour comes for free and is
 * what screen-reader users expect: Tab into the group, arrows to move/select.
 */
export function VehicleList({ devices, selectedId, onChange }: VehicleListProps) {
  const name = useId()
  const hintId = useId()
  const online = devices.filter((d) => d.status === 'online').length

  return (
    // The counter lives outside the fieldset: a rendered <legend> sits in the
    // fieldset's border area, so anything positioned inside it lands below it.
    <div className={styles.wrap}>
      <span id={hintId} className={styles.hint} data-floating>
        {online} de {devices.length} en línea
      </span>
      <fieldset className={styles.list} aria-describedby={hintId}>
        {/* <legend> must be the fieldset's first child to name the group */}
        <legend className={styles.legend}>Vehículo</legend>
        <div className={styles.options}>
          {devices.map((device) => (
            <label key={device.id} className={styles.option}>
              <input
                type="radio"
                name={name}
                value={device.id}
                checked={device.id === selectedId}
                onChange={() => onChange(device.id)}
                className={styles.radio}
              />
              <PulseIndicator status={device.status} />
              <span className={styles.text}>
                <span className={styles.name}>{device.name}</span>
                <span className={styles.status} data-status={device.status}>
                  {STATUS_LABEL[device.status]}
                </span>
              </span>
              <svg
                className={styles.check}
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="m3.5 8.5 3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

/** Same legend row and card height as the real list, `rows` times. */
export function VehicleListSkeleton({ rows }: { rows: number }) {
  return (
    // Mirrors the fieldset: a rendered <legend> is not a flex item, so no gap
    // after it — the skeleton drops the gap too to keep the exact height.
    <div className={styles.wrap} aria-hidden="true">
      <span className={styles.hint} data-floating>
        <Skeleton text="0 de 0 en línea" />
      </span>
      <div className={`${styles.list} ${styles.skeletonList}`}>
        <span className={styles.legend}>Vehículo</span>
        <div className={styles.options}>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className={styles.option} data-skeleton>
              <Skeleton width="0.625rem" height="0.625rem" radius="full" />
              <span className={styles.text}>
                <span className={styles.name}>
                  <Skeleton text="Vehículo 00" />
                </span>
                <span className={styles.status}>
                  <Skeleton text="En línea" />
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
