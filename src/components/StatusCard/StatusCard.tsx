import { useId, type ReactNode } from 'react'
import type { Device, Position } from '../../api/types'
import { formatTimestamp, lastSeen } from '../../utils/format'
import { STATUS_LABEL } from '../../utils/status'
import { courseToCompass, courseToCompassLong, knotsToKmh } from '../../utils/units'
import { ErrorState } from '../ErrorState/ErrorState'
import { Skeleton } from '../Skeleton/Skeleton'
import styles from './StatusCard.module.css'

interface StatusCardProps {
  /** null while the device list itself is still loading */
  device: Device | null
  position: Position | null | undefined
  isLoading: boolean
  /** First load failed and there is nothing to show yet */
  error?: unknown
  onRetry?: () => void
  retrying?: boolean
  /** Last poll failed or is paused: values are the last known ones */
  isStale?: boolean
  /** Loading has taken unusually long */
  slow?: boolean
}

/**
 * Loading, error and data states share one skeleton of markup (header + <dl>
 * rows with real labels), so switching between them never moves the layout.
 */
export function StatusCard({
  device,
  position,
  isLoading,
  error,
  onRetry,
  retrying,
  isStale = false,
  slow = false,
}: StatusCardProps) {
  const headingId = useId()
  const loading = isLoading || device === null
  const failed = !loading && Boolean(error) && !position

  let body: ReactNode
  if (loading) {
    body = <LoadingRows />
  } else if (failed) {
    body = (
      <ErrorState
        compact
        error={error}
        onRetry={() => onRetry?.()}
        retrying={retrying}
        context="la posición del vehículo"
      />
    )
  } else if (!position) {
    const seenAt = lastSeen(device, position)
    body = (
      <>
        <p className={styles.empty}>Este vehículo aún no ha enviado ninguna posición.</p>
        <dl className={styles.data}>
          <Row label="Última comunicación">
            {seenAt ? <time dateTime={seenAt}>{formatTimestamp(seenAt)}</time> : 'Nunca'}
          </Row>
        </dl>
      </>
    )
  } else {
    body = <DataRows position={position} />
  }

  return (
    <section
      className={styles.card}
      aria-labelledby={headingId}
      aria-busy={loading || undefined}
      data-stale={isStale || undefined}
    >
      <header className={styles.header}>
        <h2 id={headingId} className={styles.name}>
          {device ? device.name : <Skeleton text="Vehículo 000" />}
          {!device && <span className="sr-only">Vehículo</span>}
        </h2>
        {device ? (
          <p className={styles.status} data-status={device.status}>
            <span className={styles.dot} aria-hidden="true" />
            {STATUS_LABEL[device.status]}
          </p>
        ) : (
          <p className={styles.status}>
            <Skeleton text="● Estado conexión" />
          </p>
        )}
      </header>

      {/* Announced once when loading starts; empty (silent) otherwise */}
      <p className="sr-only" role="status">
        {!loading
          ? ''
          : slow
            ? 'Está tardando más de lo habitual. Seguimos intentándolo…'
            : `Cargando datos${device ? ` de ${device.name}` : ' del vehículo'}…`}
      </p>

      {body}
    </section>
  )
}

function Row({
  label,
  children,
  valueClass,
}: {
  label: string
  children: ReactNode
  valueClass?: string
}) {
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd className={valueClass}>{children}</dd>
    </div>
  )
}

/** Same rows as DataRows with transparent placeholder text of the same shape. */
function LoadingRows() {
  return (
    <dl className={styles.data}>
      <Row label="Velocidad" valueClass={styles.speed}>
        <Skeleton text="00 km/h" />
      </Row>
      <Row label="Batería">
        <Skeleton text="100 %" />
      </Row>
      <Row label="Rumbo">
        <Skeleton text="000° NO" />
      </Row>
      <Row label="Coordenadas" valueClass={styles.mono}>
        <Skeleton text="00.00000, -0.00000" />
      </Row>
      <Row label="Última actualización">
        <Skeleton text="00:00:00" />
      </Row>
    </dl>
  )
}

function DataRows({ position }: { position: Position }) {
  const battery = position.attributes.batteryLevel
  const course = Math.round(position.course)

  return (
    <dl className={styles.data}>
      <Row label="Velocidad" valueClass={styles.speed}>
        {Math.round(knotsToKmh(position.speed))}{' '}
        <abbr title="kilómetros por hora" className={styles.unit}>
          km/h
        </abbr>
      </Row>
      <Row label="Batería">{battery === undefined ? '—' : `${Math.round(battery)} %`}</Row>
      <Row label="Rumbo">
        <span aria-hidden="true">
          {course}° {courseToCompass(position.course)}
        </span>
        <span className="sr-only">
          {course} grados, {courseToCompassLong(position.course)}
        </span>
      </Row>
      <Row label="Coordenadas" valueClass={styles.mono}>
        {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
      </Row>
      <Row label="Última actualización">
        <time dateTime={position.fixTime}>{formatTimestamp(position.fixTime)}</time>
      </Row>
    </dl>
  )
}
