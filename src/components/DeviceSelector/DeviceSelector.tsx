import { useId } from 'react'
import type { Device } from '../../api/types'
import { STATUS_LABEL } from '../../utils/status'
import { Skeleton } from '../Skeleton/Skeleton'
import styles from './DeviceSelector.module.css'

interface DeviceSelectorProps {
  devices: Device[]
  selectedId: number | null
  onChange: (id: number | null) => void
}

/**
 * Native <select>: fully keyboard operable (arrows, type-ahead, Enter/Space),
 * native picker on mobile, and announced correctly by every screen reader.
 * Status is spelled out in each option, never conveyed by color alone.
 */
export function DeviceSelector({ devices, selectedId, onChange }: DeviceSelectorProps) {
  const id = useId()
  const hintId = useId()
  const online = devices.filter((d) => d.status === 'online').length

  return (
    <div className={styles.selector}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          Vehículo
        </label>
        <span id={hintId} className={styles.hint}>
          {online} de {devices.length} en línea
        </span>
      </div>
      <div className={styles.selectWrap}>
        <select
          id={id}
          className={styles.select}
          value={selectedId ?? ''}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="" disabled>
            Selecciona un vehículo
          </option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name} · {STATUS_LABEL[device.status]}
            </option>
          ))}
        </select>
        <svg
          className={styles.chevron}
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

/** Same label row and control height as the real selector, so nothing moves on load. */
export function DeviceSelectorSkeleton() {
  return (
    <div className={styles.selector} aria-hidden="true">
      <div className={styles.labelRow}>
        <span className={styles.label}>Vehículo</span>
        <span className={styles.hint}>
          <Skeleton text="0 de 0 en línea" />
        </span>
      </div>
      <Skeleton height="var(--tap-target-min)" radius="md" />
    </div>
  )
}
