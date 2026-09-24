import { useId, useState } from 'react'
import type { Device } from '../../api/types'
import { STATUS_LABEL } from '../../utils/status'
import { PulseIndicator } from '../PulseIndicator/PulseIndicator'
import { RelativeTime } from '../RelativeTime/RelativeTime'
import { Skeleton } from '../Skeleton/Skeleton'
import styles from './VehicleList.module.css'

type Filter = 'all' | 'online' | 'noSignal'

const FILTERS: { id: Filter; label: string; match: (d: Device) => boolean }[] = [
  { id: 'all', label: 'Todos', match: () => true },
  { id: 'online', label: 'En línea', match: (d) => d.status === 'online' },
  // "Sin señal" groups offline and silent-for-a-while: both mean "not reporting now"
  { id: 'noSignal', label: 'Sin señal', match: (d) => d.status !== 'online' },
]

interface VehicleListProps {
  devices: Device[]
  selectedId: number | null
  onChange: (id: number) => void
  /** Live data of the selected vehicle (the only one being polled) */
  selectedLive?: { speedKmh: number | null; fixTime: string | null }
}

/** Small fleets are shown as a list: every vehicle's status is visible at a glance. */
export const VEHICLE_LIST_MAX = 6

/**
 * Fleet list with status filters. Both controls are native radio groups
 * (fieldset + legend): Tab into a group, arrows to move — the keyboard and
 * screen-reader behaviour comes for free.
 */
export function VehicleList({ devices, selectedId, onChange, selectedLive }: VehicleListProps) {
  const name = useId()
  const filterName = useId()
  const [filter, setFilter] = useState<Filter>('all')
  const active = FILTERS.find((f) => f.id === filter)!
  const visible = devices.filter(active.match)

  return (
    <div className={styles.fleet}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Flota</h2>
        <span className={styles.count}>
          {devices.length} {devices.length === 1 ? 'vehículo' : 'vehículos'}
        </span>
      </div>

      <fieldset className={styles.filters}>
        <legend className="sr-only">Filtrar vehículos</legend>
        {FILTERS.map((f) => {
          const n = devices.filter(f.match).length
          return (
            <label key={f.id} className={styles.segment}>
              <input
                type="radio"
                name={filterName}
                value={f.id}
                checked={filter === f.id}
                onChange={() => setFilter(f.id)}
                className={styles.radio}
              />
              <span>{f.label}</span>
              <span className={styles.segmentCount}>
                <span className="sr-only">(</span>
                {n}
                <span className="sr-only">)</span>
              </span>
            </label>
          )
        })}
      </fieldset>

      <fieldset className={styles.list}>
        <legend className="sr-only">Vehículo</legend>
        {visible.map((device) => {
          const isSelected = device.id === selectedId
          const live = isSelected ? selectedLive : undefined
          return (
            <label key={device.id} className={styles.option}>
              <input
                type="radio"
                name={name}
                value={device.id}
                checked={isSelected}
                onChange={() => onChange(device.id)}
                className={styles.radio}
              />
              <span className={styles.icon} aria-hidden="true">
                <TruckIcon />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{device.name}</span>
                <span className={styles.status} data-status={device.status}>
                  <PulseIndicator status={device.status} />
                  <span>{STATUS_LABEL[device.status]}</span>
                  {live?.fixTime && (
                    <span className={styles.ago}>
                      {' · '}
                      <RelativeTime iso={live.fixTime} compact />
                    </span>
                  )}
                </span>
              </span>
              <span className={styles.speed}>
                {live?.speedKmh != null ? (
                  `${Math.round(live.speedKmh)} km/h`
                ) : (
                  <span aria-hidden="true">–</span>
                )}
              </span>
            </label>
          )
        })}
        {visible.length === 0 && (
          <p className={styles.empty}>
            {filter === 'online' ? 'Ningún vehículo en línea.' : 'Ningún vehículo sin señal.'}
          </p>
        )}
      </fieldset>
    </div>
  )
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7" />
      <circle cx="6.5" cy="17" r="1.8" />
      <circle cx="16.8" cy="17" r="1.8" />
    </svg>
  )
}

/** Same heading, filter bar and card height as the real list, `rows` times. */
export function VehicleListSkeleton({ rows }: { rows: number }) {
  return (
    <div className={styles.fleet} aria-hidden="true">
      <div className={styles.heading}>
        <span className={styles.title}>Flota</span>
        <span className={styles.count}>
          <Skeleton text="0 vehículos" />
        </span>
      </div>
      <div className={styles.filters}>
        {['Todos', 'En línea', 'Sin señal'].map((label) => (
          <span key={label} className={styles.segment}>
            <span>{label}</span>
            <span className={styles.segmentCount}>
              <Skeleton text="0" />
            </span>
          </span>
        ))}
      </div>
      <div className={styles.list}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={styles.option} data-skeleton>
            <span className={styles.icon} />
            <span className={styles.text}>
              <span className={styles.name}>
                <Skeleton text="Vehículo 00" />
              </span>
              <span className={styles.status}>
                <Skeleton text="● En línea" />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
