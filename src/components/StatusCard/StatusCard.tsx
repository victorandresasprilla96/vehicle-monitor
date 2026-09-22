import { useId } from 'react'
import type { Device, Position } from '../../api/types'
import { formatTimestamp, lastSeen } from '../../utils/format'
import { STATUS_LABEL } from '../../utils/status'
import { courseToCompass, courseToCompassLong, knotsToKmh } from '../../utils/units'
import styles from './StatusCard.module.css'

interface StatusCardProps {
  device: Device
  position: Position | null | undefined
  isLoading: boolean
  /** Last poll failed: values shown are the last known ones */
  isStale: boolean
}

export function StatusCard({ device, position, isLoading, isStale }: StatusCardProps) {
  const headingId = useId()
  const battery = position?.attributes.batteryLevel
  const seenAt = lastSeen(device, position)
  const lastUpdateRow = (label: string) => (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd>{seenAt ? <time dateTime={seenAt}>{formatTimestamp(seenAt)}</time> : 'Nunca'}</dd>
    </div>
  )

  return (
    <section className={styles.card} aria-labelledby={headingId} aria-busy={isLoading || undefined}>
      <header className={styles.header}>
        <h2 id={headingId} className={styles.name}>
          {device.name}
        </h2>
        <p className={styles.status} data-status={device.status}>
          <span className={styles.dot} aria-hidden="true" />
          {STATUS_LABEL[device.status]}
        </p>
      </header>

      {isStale && (
        <p className={styles.stale} role="status">
          Conexión inestable. Mostrando los últimos datos conocidos mientras reintentamos.
        </p>
      )}

      {isLoading ? (
        <p className={styles.empty}>Cargando posición…</p>
      ) : !position ? (
        <>
          <p className={styles.empty}>Este vehículo aún no ha enviado ninguna posición.</p>
          <dl className={styles.data}>{lastUpdateRow('Última comunicación')}</dl>
        </>
      ) : (
        <dl className={styles.data}>
          <div className={styles.row}>
            <dt>Velocidad</dt>
            <dd className={styles.speed}>
              {Math.round(knotsToKmh(position.speed))}{' '}
              <abbr title="kilómetros por hora" className={styles.unit}>
                km/h
              </abbr>
            </dd>
          </div>
          <div className={styles.row}>
            <dt>Batería</dt>
            <dd>{battery === undefined ? '—' : `${Math.round(battery)} %`}</dd>
          </div>
          <div className={styles.row}>
            <dt>Rumbo</dt>
            <dd>
              <span aria-hidden="true">
                {Math.round(position.course)}° {courseToCompass(position.course)}
              </span>
              <span className="sr-only">
                {Math.round(position.course)} grados, {courseToCompassLong(position.course)}
              </span>
            </dd>
          </div>
          <div className={styles.row}>
            <dt>Coordenadas</dt>
            <dd className={styles.mono}>
              {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
            </dd>
          </div>
          {lastUpdateRow('Última actualización')}
        </dl>
      )}
    </section>
  )
}
