import { useEffect, useId, useState, type ReactNode } from 'react'
import type { Device, Position } from '../../api/types'
import { STOPPED_KMH, useVehicleAnnouncements } from '../../hooks/useVehicleAnnouncements'
import { formatTimestamp, lastSeen } from '../../utils/format'
import { STATUS_LABEL } from '../../utils/status'
import { courseToCompass, courseToCompassLong, knotsToKmh } from '../../utils/units'
import { AnimatedValue } from '../AnimatedValue/AnimatedValue'
import { BatteryLevel } from '../BatteryLevel/BatteryLevel'
import { ErrorState } from '../ErrorState/ErrorState'
import { PulseIndicator } from '../PulseIndicator/PulseIndicator'
import { RelativeTime } from '../RelativeTime/RelativeTime'
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
  /** Follow-the-vehicle camera (switch shown when provided and there is a position) */
  following?: boolean
  onFollowingChange?: (following: boolean) => void
  /** Collapse the side panel (desktop): shown as an icon button in the header */
  onCollapse?: () => void
  /** id of the element the collapse button hides (for aria-controls) */
  collapseControls?: string
}

/**
 * Loading, error and data states share one skeleton of markup (header, chips,
 * metric tiles and rows with real labels), so switching never moves the layout.
 * All label/value pairs stay a <dl>; tiles are only a visual grouping.
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
  following,
  onFollowingChange,
  onCollapse,
  collapseControls,
}: StatusCardProps) {
  const headingId = useId()
  const loading = isLoading || device === null
  const failed = !loading && Boolean(error) && !position
  const announcement = useVehicleAnnouncements(loading ? null : device, position)
  const speedKmh = position ? knotsToKmh(position.speed) : null

  let body: ReactNode
  if (loading) {
    body = <LoadingBody />
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
    body = <DataBody position={position} />
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
        {onCollapse && (
          <button
            type="button"
            className={styles.iconButton}
            aria-expanded="true"
            aria-controls={collapseControls}
            onClick={onCollapse}
            title="Ocultar panel"
          >
            <span className="sr-only">Panel del vehículo</span>
            <CollapseIcon />
          </button>
        )}
      </header>

      <div className={styles.chips}>
        {device ? (
          <p className={styles.chip} data-status={device.status}>
            <PulseIndicator status={device.status} />
            <AnimatedValue value={device.status}>{STATUS_LABEL[device.status]}</AnimatedValue>
          </p>
        ) : (
          <p className={styles.chip}>
            <Skeleton text="● Estado" />
          </p>
        )}
        {speedKmh !== null && !failed && (
          <p className={styles.chip} data-tone="neutral">
            <AnimatedValue value={speedKmh >= STOPPED_KMH}>
              {speedKmh >= STOPPED_KMH ? 'En movimiento' : 'Detenido'}
            </AnimatedValue>
          </p>
        )}
      </div>

      {/* Single polite live region: loading progress, then only meaningful
          changes (status, stop/start, battery thresholds, big speed jumps). */}
      <p className="sr-only" role="status">
        {!loading
          ? announcement
          : slow
            ? 'Está tardando más de lo habitual. Seguimos intentándolo…'
            : `Cargando datos${device ? ` de ${device.name}` : ' del vehículo'}…`}
      </p>

      {body}

      {position && onFollowingChange && (
        <FollowSwitch following={following ?? false} onChange={onFollowingChange} />
      )}
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

function Tile({
  label,
  children,
  className,
  peek,
}: {
  label: string
  children: ReactNode
  className?: string
  /** Bottom edge of what the collapsed mobile sheet shows */
  peek?: boolean
}) {
  return (
    <div className={`${styles.tile} ${className ?? ''}`} data-sheet-peek={peek || undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Same tiles and rows as DataBody with transparent placeholder text of the same shape. */
function LoadingBody() {
  return (
    <dl className={styles.data}>
      <Tile label="Velocidad" className={styles.speedTile} peek>
        <span className={styles.speed}>
          <Skeleton text="00" />
        </span>
      </Tile>
      <Tile label="Rumbo" className={styles.headingTile}>
        <span className={styles.heading}>
          <span className={styles.compass} />
          <Skeleton text="000° SSO" />
        </span>
      </Tile>
      <Tile label="Batería del rastreador" className={styles.batteryTile}>
        <Skeleton text="100 %" />
      </Tile>
      <Row label="Coordenadas" valueClass={styles.mono}>
        <Skeleton text="00.00000, -0.00000" />
      </Row>
      <Row label="Última actualización">
        <Skeleton text="● Ahora · 00:00:00" />
      </Row>
    </dl>
  )
}

/** Speed only gets the colour highlight for a change a person would notice. */
const significantSpeedChange = (a: number, b: number) => Math.abs(a - b) >= 5

function DataBody({ position }: { position: Position }) {
  const battery = position.attributes.batteryLevel
  const course = Math.round(position.course)
  const speed = Math.round(knotsToKmh(position.speed))
  const coords = `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`

  return (
    <dl className={styles.data}>
      <Tile label="Velocidad" className={styles.speedTile} peek>
        <span className={styles.speed}>
          <AnimatedValue value={speed} highlightWhen={significantSpeedChange}>
            {speed}
          </AnimatedValue>
          <abbr title="kilómetros por hora" className={styles.unit}>
            {' km/h'}
          </abbr>
        </span>
      </Tile>
      <Tile label="Rumbo" className={styles.headingTile}>
        <span className={styles.heading}>
          <span className={styles.compass} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              style={{ transform: `rotate(${course}deg)` }}
            >
              <path d="M12 3.5 18 20 12 16.6 6 20Z" fill="currentColor" />
            </svg>
          </span>
          <span aria-hidden="true">
            {course}° <span className={styles.point}>{courseToCompass(position.course)}</span>
          </span>
          <span className="sr-only">
            {course} grados, {courseToCompassLong(position.course)}
          </span>
        </span>
      </Tile>
      <Tile label="Batería del rastreador" className={styles.batteryTile}>
        {battery === undefined ? '—' : <BatteryLevel level={battery} />}
      </Tile>
      <Row label="Coordenadas" valueClass={styles.mono}>
        <span className={styles.coords}>
          {coords}
          <CopyButton text={coords} />
        </span>
      </Row>
      <Row label="Última actualización">
        <RelativeTime iso={position.fixTime} />
      </Row>
    </dl>
  )
}

type CopyState = 'idle' | 'copied' | 'failed'

/** Copies the coordinates; confirms visually (✓) and to screen readers. */
function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed') // insecure context or permission denied
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.copy}
        onClick={copy}
        aria-label="Copiar coordenadas"
        title="Copiar coordenadas"
        data-state={state}
      >
        {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
      </button>
      <span className="sr-only" role="status">
        {state === 'copied'
          ? 'Coordenadas copiadas'
          : state === 'failed'
            ? 'No se pudieron copiar las coordenadas'
            : ''}
      </span>
    </>
  )
}

/** "Seguir vehículo" — a real switch (role, aria-checked), described by its subtitle. */
function FollowSwitch({
  following,
  onChange,
}: {
  following: boolean
  onChange: (v: boolean) => void
}) {
  const labelId = useId()
  const hintId = useId()
  return (
    <div className={styles.follow}>
      <span className={styles.followText}>
        <span id={labelId} className={styles.followLabel}>
          Seguir vehículo
        </span>
        <span id={hintId} className={styles.followHint}>
          Mantiene el mapa centrado en él
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={following}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className={styles.switch}
        onClick={() => onChange(!following)}
      >
        <span className={styles.switchThumb} />
      </button>
    </div>
  )
}

function CollapseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="3" width="15" height="14" rx="2.5" />
      <path d="M7.5 3v14M13.5 7.5 11 10l2.5 2.5" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6.5" y="6.5" width="10" height="10" rx="2" />
      <path d="M13.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  )
}
