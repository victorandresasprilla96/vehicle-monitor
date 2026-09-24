import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { DeviceStatus } from '../../api/types'
import { MarkerAnimator, type MarkerState } from './markerAnimator'
import styles from './VehicleMap.module.css'

interface VehicleMarkerProps {
  /** Changing it (vehicle switch) jumps instead of animating */
  deviceId: number
  lat: number
  lng: number
  course: number
  status: DeviceStatus
  stale: boolean
  /** Screen-reader description, e.g. "Camión 01, en línea, 43 km/h, rumbo noreste" */
  label: string
  /** Visible tag under the marker, e.g. "Camión 01 · 43 km/h" (decorative: the label says it) */
  tag: string
  animate: boolean
}

// Puck + heading arrow (same shape language as the brand mark; points north at 0°).
// The raised disc keeps the vehicle findable at a glance over a busy street map.
const ICON_HTML = `
  <span class="${styles.halo}"></span>
  <span class="${styles.pulse}"></span>
  <span class="${styles.puck}">
    <svg class="${styles.arrow}" viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M16 3 26.5 27.5 16 22 5.5 27.5Z" />
    </svg>
  </span>
  <span class="${styles.tag}" aria-hidden="true"></span>
`

/**
 * Leaflet marker driven imperatively: created once, then position and
 * heading are written straight to Leaflet/DOM by MarkerAnimator each frame.
 * React only re-renders when a new fix arrives (every few seconds).
 */
export function VehicleMarker({
  deviceId,
  lat,
  lng,
  course,
  status,
  stale,
  label,
  tag,
  animate,
}: VehicleMarkerProps) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)
  const animatorRef = useRef<MarkerAnimator | null>(null)
  const deviceRef = useRef(deviceId)

  // Create once
  useEffect(() => {
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: styles.marker,
        html: ICON_HTML,
        iconSize: [56, 56],
        iconAnchor: [28, 28],
      }),
      // Not a tab stop: the status card is the keyboard/screen-reader surface.
      // The marker still exposes role="img" + label for virtual-cursor users.
      interactive: false,
      keyboard: false,
    }).addTo(map)

    const el = marker.getElement()
    el?.setAttribute('role', 'img')
    const arrow = el?.querySelector<SVGElement>(`.${styles.arrow}`)

    const animator = new MarkerAnimator((state: MarkerState) => {
      marker.setLatLng([state.position.lat, state.position.lng])
      if (arrow) arrow.style.transform = `rotate(${state.heading}deg)`
    })

    markerRef.current = marker
    animatorRef.current = animator
    return () => {
      animator.stop()
      marker.remove()
      markerRef.current = null
      animatorRef.current = null
    }
    // Position props are applied by the effect below; the marker is created only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // New fix → glide (or jump on first fix / vehicle switch / reduced motion)
  useEffect(() => {
    const switched = deviceRef.current !== deviceId
    deviceRef.current = deviceId
    animatorRef.current?.moveTo(
      { position: { lat, lng }, heading: course },
      { animate: animate && !switched },
    )
  }, [deviceId, lat, lng, course, animate])

  // Status / label / tag → DOM attributes and text only (cheap, no marker rebuild)
  useEffect(() => {
    const el = markerRef.current?.getElement()
    if (!el) return
    el.dataset.status = status
    el.toggleAttribute('data-stale', stale)
    el.setAttribute('aria-label', label)
    const tagEl = el.querySelector(`.${styles.tag}`)
    if (tagEl) tagEl.textContent = tag
  }, [status, stale, label, tag])

  return null
}
