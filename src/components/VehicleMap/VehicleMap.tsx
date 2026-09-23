import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import type { Device, Position } from '../../api/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useMapBottomInset } from '../AppShell/layoutContext'
import { STATUS_LABEL } from '../../utils/status'
import { courseToCompassLong, knotsToKmh } from '../../utils/units'
import { MapSkeleton } from '../MapSkeleton/MapSkeleton'
import { MARKER_ANIMATION_MS } from './markerAnimator'
import { enableSpaceActivation } from './spaceActivation'
import { VehicleMarker } from './VehicleMarker'
import styles from './VehicleMap.module.css'

const DEFAULT_ZOOM = 16
const TILE_READY_FALLBACK_MS = 4000
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
}

export default function VehicleMap({ device, position, stale }: VehicleMapProps) {
  const reducedMotion = useReducedMotion()
  const [tilesReady, setTilesReady] = useState(false)
  const [following, setFollowing] = useState(true)
  const [followedDevice, setFollowedDevice] = useState(device.id)
  const stopFollowing = useCallback(() => setFollowing(false), [])

  // Switching vehicle always re-engages follow mode (derived during render)
  if (followedDevice !== device.id) {
    setFollowedDevice(device.id)
    setFollowing(true)
  }

  // Never leave the skeleton up if tiles are slow or blocked: show the marker anyway.
  useEffect(() => {
    const timer = window.setTimeout(() => setTilesReady(true), TILE_READY_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const initial = position ?? { latitude: 40.4168, longitude: -3.7038 }

  return (
    <div className={styles.wrap}>
      {/* First in DOM so Tab order is: follow toggle → map → zoom controls */}
      <button
        type="button"
        className={styles.follow}
        aria-pressed={following}
        disabled={!position}
        onClick={() => setFollowing((f) => !f)}
      >
        <CrosshairIcon />
        <span>Seguir vehículo</span>
      </button>

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
          eventHandlers={{ load: () => setTilesReady(true) }}
        />
        <ZoomControl position="bottomright" zoomInTitle="Acercar" zoomOutTitle="Alejar" />
        <MapBehaviour
          deviceId={device.id}
          target={position ? [position.latitude, position.longitude] : null}
          following={following}
          animate={!reducedMotion}
          onUserMove={stopFollowing}
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
    </div>
  )
}

function markerLabel(device: Device, position: Position): string {
  const speed = Math.round(knotsToKmh(position.speed))
  return `${device.name}, ${STATUS_LABEL[device.status].toLowerCase()}, ${speed} km/h, rumbo ${courseToCompassLong(position.course)}`
}

interface MapBehaviourProps {
  deviceId: number
  target: [number, number] | null
  following: boolean
  animate: boolean
  onUserMove: () => void
}

/** Accessible container semantics, follow-the-vehicle camera and "user took over" detection. */
function MapBehaviour({ deviceId, target, following, animate, onUserMove }: MapBehaviourProps) {
  const map = useMap()
  // Part of the map hidden behind the mobile bottom sheet: centre the vehicle
  // in the *visible* area by shifting the camera down by half of it.
  const bottomInset = useMapBottomInset()
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

  // The container resizes without a window resize (panel collapsed, layout
  // breakpoint): tell Leaflet, or it leaves grey untiled areas.
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false })) // keeps the centre
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
    const centre = map.unproject(map.project([lat, lng], zoom).add([0, bottomInset / 2]), zoom)
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
  }, [map, lat, lng, following, animate, deviceId, bottomInset])

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
