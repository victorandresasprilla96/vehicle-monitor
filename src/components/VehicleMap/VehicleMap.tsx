import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import type { Device, Position } from '../../api/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useMapInsets } from '../AppShell/layoutContext'
import { STATUS_LABEL } from '../../utils/status'
import { courseToCompassLong, knotsToKmh } from '../../utils/units'
import { MapSkeleton } from '../MapSkeleton/MapSkeleton'
import { MARKER_ANIMATION_MS } from './markerAnimator'
import { enableSpaceActivation } from './spaceActivation'
import { VehicleMarker } from './VehicleMarker'
import styles from './VehicleMap.module.css'

const DEFAULT_ZOOM = 16
const TILE_READY_FALLBACK_MS = 2500
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

// OpenStreetMap standard tiles (no API key). CARTO basemaps now watermark
// keyless requests. Theming is a CSS filter on the tile pane (--map-tile-filter),
// so switching theme is instant and never reloads tiles.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>'

interface VehicleMapProps {
  device: Device
  /** undefined: loading this vehicle · null: it never reported a position */
  position: Position | null | undefined
  stale: boolean
  /** Follow-the-vehicle camera, shared with the status card's switch */
  following: boolean
  onFollowingChange: (following: boolean) => void
}

export default function VehicleMap({
  device,
  position,
  stale,
  following,
  onFollowingChange,
}: VehicleMapProps) {
  const reducedMotion = useReducedMotion()
  const [tilesReady, setTilesReady] = useState(false)
  // Height of Leaflet's attribution strip: the follow button sits above it, so
  // the OSM credit (required by its licence) is never covered — at any text size.
  // null until measured: CSS falls back to the one-line height, so the button
  // doesn't jump up when the first measurement arrives (measured as layout shift).
  const [attributionHeight, setAttributionHeight] = useState<number | null>(null)
  const stopFollowing = useCallback(() => onFollowingChange(false), [onFollowingChange])
  const startFollowing = useCallback(() => onFollowingChange(true), [onFollowingChange])

  // Never leave the skeleton up if tiles are slow or blocked: show the marker anyway.
  useEffect(() => {
    const timer = window.setTimeout(() => setTilesReady(true), TILE_READY_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const initial = position ?? { latitude: 40.4168, longitude: -3.7038 }

  return (
    <div
      className={styles.wrap}
      style={
        attributionHeight === null
          ? undefined
          : ({ '--attribution-height': `${attributionHeight}px` } as CSSProperties)
      }
    >
      <MapContainer
        className={styles.map}
        center={[initial.latitude, initial.longitude]}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        zoomAnimation={!reducedMotion}
        fadeAnimation={!reducedMotion}
        markerZoomAnimation={!reducedMotion}
        keyboard
      >
        <TileLayer
          url={TILE_URL}
          attribution={ATTRIBUTION}
          maxZoom={19}
          // Reveal the map with the first painted tile; the rest fill in progressively.
          // Waiting for `load` (every visible tile) kept the skeleton up for seconds
          // whenever one tile was slow — measured as a 5.7 s LCP in production.
          eventHandlers={{ tileload: () => setTilesReady(true), load: () => setTilesReady(true) }}
        />
        <ZoomControl position="bottomright" zoomInTitle="Acercar" zoomOutTitle="Alejar" />
        {/* Added after zoom: Leaflet stacks bottom controls upwards, so it sits above it */}
        <LocateControl disabled={!position} onLocate={startFollowing} />
        <MapBehaviour
          deviceId={device.id}
          target={position ? [position.latitude, position.longitude] : null}
          following={following}
          animate={!reducedMotion}
          onUserMove={stopFollowing}
          onAttributionResize={setAttributionHeight}
        />
        {position && (
          <VehicleMarker
            deviceId={device.id}
            lat={position.latitude}
            lng={position.longitude}
            course={position.course}
            status={device.status}
            stale={stale}
            animate={!reducedMotion}
            label={markerLabel(device, position)}
            tag={`${device.name} · ${Math.round(knotsToKmh(position.speed))} km/h`}
          />
        )}
      </MapContainer>

      {/* Skeleton fades out once tiles are painted, or covers the map while a
          newly selected vehicle loads (so the previous one is never shown). */}
      <div className={styles.overlay} data-visible={!tilesReady || position === undefined}>
        <MapSkeleton />
      </div>

      {position === null && (
        <div className={styles.notice}>
          <p>Este vehículo aún no ha enviado ninguna posición.</p>
        </div>
      )}

      {/* Follow state at a glance, with the one action that changes it */}
      {position && (
        <div className={styles.pill} data-following={following || undefined}>
          <CrosshairIcon />
          <span className={styles.pillText} role="status">
            {following ? `Siguiendo a ${device.name}` : 'Mapa libre'}
          </span>
          <button
            type="button"
            className={styles.pillAction}
            onClick={() => onFollowingChange(!following)}
          >
            {following ? 'Dejar de seguir' : `Seguir a ${device.name}`}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * "Centrar en el vehículo" as a Leaflet control, so it stacks with the zoom
 * buttons in the same corner. A real <button>: keyboard and screen readers work.
 */
function LocateControl({ disabled, onLocate }: { disabled: boolean; onLocate: () => void }) {
  const map = useMap()
  const onLocateRef = useRef(onLocate)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    onLocateRef.current = onLocate
  }, [onLocate])

  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const wrap = L.DomUtil.create('div', `leaflet-bar ${styles.locate}`)
        const button = L.DomUtil.create('button', '', wrap)
        button.type = 'button'
        button.setAttribute('aria-label', 'Centrar en el vehículo')
        button.title = 'Centrar en el vehículo'
        button.innerHTML = LOCATE_ICON
        L.DomEvent.disableClickPropagation(wrap)
        L.DomEvent.on(button, 'click', () => onLocateRef.current())
        buttonRef.current = button
        return wrap
      },
    })
    const control = new Control({ position: 'bottomright' })
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map])

  useEffect(() => {
    if (buttonRef.current) buttonRef.current.disabled = disabled
  }, [disabled])

  return null
}

const LOCATE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>`

function markerLabel(device: Device, position: Position): string {
  const speed = Math.round(knotsToKmh(position.speed))
  return `${device.name}, ${STATUS_LABEL[device.status].toLowerCase()}, ${speed} km/h, rumbo ${courseToCompassLong(position.course)}`
}

interface MapBehaviourProps {
  onAttributionResize: (height: number) => void
  deviceId: number
  target: [number, number] | null
  following: boolean
  animate: boolean
  onUserMove: () => void
}

/** Accessible container semantics, follow-the-vehicle camera and "user took over" detection. */
function MapBehaviour({
  deviceId,
  target,
  following,
  animate,
  onUserMove,
  onAttributionResize,
}: MapBehaviourProps) {
  const map = useMap()
  // Parts of the map hidden behind overlays (mobile sheet at the bottom, status
  // card on the left): centre the vehicle in the *visible* area.
  const { bottom: bottomInset, left: leftInset } = useMapInsets()
  const [lat, lng] = target ?? [null, null]
  // Which vehicle the camera last framed; a ref, since it doesn't affect rendering
  const cameraDevice = useRef<number | null>(null)

  // Container semantics + Spanish attribution prefix (once)
  useEffect(() => {
    const el = map.getContainer()
    el.setAttribute('role', 'application')
    el.setAttribute('aria-roledescription', 'mapa')
    el.setAttribute(
      'aria-label',
      'Mapa del vehículo. Usa las flechas para desplazarte y las teclas más y menos para el zoom.',
    )
    map.attributionControl?.setPrefix('<a href="https://leafletjs.com">Leaflet</a>')
    // Zoom controls are <a role="button">: make Space work like on a real button
    return enableSpaceActivation(el)
  }, [map])

  // Report the attribution strip height (it wraps with large text / narrow maps)
  useEffect(() => {
    const attribution = map.getContainer().querySelector('.leaflet-control-attribution')
    if (!attribution) return
    const observer = new ResizeObserver(([entry]) =>
      onAttributionResize(
        Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height),
      ),
    )
    observer.observe(attribution)
    return () => observer.disconnect()
  }, [map, onAttributionResize])

  // Latest camera inputs, for the resize handler below (it outlives renders)
  const camera = useRef({ lat, lng, following, bottomInset, leftInset })
  useEffect(() => {
    camera.current = { lat, lng, following, bottomInset, leftInset }
  })

  // The container resizes without a window resize (panel collapsed, phone
  // rotated, layout switch): tell Leaflet, or it leaves grey untiled areas, and
  // re-frame the vehicle at once — a resize cuts any camera animation short.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false })
      const c = camera.current
      if (!c.following || c.lat === null || c.lng === null) return
      const zoom = map.getZoom()
      const centre = map.unproject(
        map.project([c.lat, c.lng], zoom).add([-c.leftInset / 2, c.bottomInset / 2]),
        zoom,
      )
      map.setView(centre, zoom, { animate: false })
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  // Dragging or keyboard-panning means the operator is looking elsewhere: stop following.
  useEffect(() => {
    const el = map.getContainer()
    const onKey = (e: KeyboardEvent) => ARROW_KEYS.has(e.key) && onUserMove()
    map.on('dragstart', onUserMove)
    el.addEventListener('keydown', onKey)
    return () => {
      map.off('dragstart', onUserMove)
      el.removeEventListener('keydown', onKey)
    }
  }, [map, onUserMove])

  // Camera: jump on vehicle switch, otherwise glide with the marker (same curve & duration).
  useEffect(() => {
    if (lat === null || lng === null || !following) return
    const firstFrame = cameraDevice.current !== deviceId
    const zoom = firstFrame ? Math.max(map.getZoom(), DEFAULT_ZOOM) : map.getZoom()
    const centre = map.unproject(
      map.project([lat, lng], zoom).add([-leftInset / 2, bottomInset / 2]),
      zoom,
    )
    if (firstFrame) {
      map.setView(centre, zoom, { animate: false })
      cameraDevice.current = deviceId
      return
    }
    map.panTo(centre, {
      animate,
      duration: MARKER_ANIMATION_MS / 1000,
      // Leaflet eases with 1 - (1 - t)^(1/easeLinearity): 1/3 → ease-out cubic,
      // exactly the marker's curve, so the vehicle stays centred while both move.
      easeLinearity: 1 / 3,
    })
  }, [map, lat, lng, following, animate, deviceId, bottomInset, leftInset])

  return null
}

function CrosshairIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="5.5" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
    </svg>
  )
}
