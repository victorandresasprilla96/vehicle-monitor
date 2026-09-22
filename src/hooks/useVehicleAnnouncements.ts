import { useState } from 'react'
import type { Device, Position } from '../api/types'
import { batteryTier, type BatteryTier } from '../utils/battery'
import { STATUS_LABEL } from '../utils/status'
import { knotsToKmh } from '../utils/units'

/** Below this the vehicle counts as stopped (GPS jitter reads 1–2 km/h when parked) */
export const STOPPED_KMH = 3
/** A speed change must be this large to be spoken */
export const SPEED_ANNOUNCE_DELTA_KMH = 20

interface Baseline {
  deviceId: number
  status: Device['status']
  battery: BatteryTier | null
  /** Last speed that was announced (or the first one seen) */
  speed: number | null
}

function snapshot(device: Device, position: Position | null | undefined): Baseline {
  const battery = position?.attributes.batteryLevel
  return {
    deviceId: device.id,
    status: device.status,
    battery: battery === undefined ? null : batteryTier(battery),
    speed: position ? knotsToKmh(position.speed) : null,
  }
}

/**
 * What a screen reader should hear about *meaningful* changes only:
 * connection status, stopping/starting, battery crossing a threshold, or a
 * large speed change. Polling every 5 s must never turn into constant chatter.
 * Switching vehicle resets the baseline silently (the card already says it's loading).
 */
export function useVehicleAnnouncements(
  device: Device | null,
  position: Position | null | undefined,
): string {
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [message, setMessage] = useState('')

  if (!device) return message

  const next = snapshot(device, position)

  // First sight of this vehicle, or its first position: record silently.
  const isNewVehicle = !baseline || baseline.deviceId !== device.id
  const isFirstFix = baseline?.speed === null && next.speed !== null
  if (isNewVehicle || isFirstFix) {
    setBaseline(next)
    if (message) setMessage('')
    return ''
  }

  const parts: string[] = []
  const updated: Baseline = { ...baseline }

  if (next.status !== baseline.status) {
    parts.push(`${device.name}: ${STATUS_LABEL[next.status].toLowerCase()}`)
    updated.status = next.status
  }

  if (next.speed !== null && baseline.speed !== null) {
    const wasStopped = baseline.speed < STOPPED_KMH
    const isStopped = next.speed < STOPPED_KMH
    if (wasStopped !== isStopped) {
      parts.push(
        isStopped ? `${device.name} se ha detenido` : `${device.name} se ha puesto en marcha`,
      )
      updated.speed = next.speed
    } else if (Math.abs(next.speed - baseline.speed) >= SPEED_ANNOUNCE_DELTA_KMH) {
      parts.push(`Velocidad ${Math.round(next.speed)} km/h`)
      updated.speed = next.speed
    }
  }

  if (next.battery !== baseline.battery) {
    const level = Math.round(position?.attributes.batteryLevel ?? 0)
    if (next.battery === 'critical') parts.push(`Batería crítica: ${level} %`)
    else if (next.battery === 'low' && baseline.battery !== 'critical')
      parts.push(`Batería baja: ${level} %`)
    updated.battery = next.battery
  }

  if (
    updated.status !== baseline.status ||
    updated.speed !== baseline.speed ||
    updated.battery !== baseline.battery
  ) {
    setBaseline(updated)
    if (parts.length) setMessage(parts.join('. ') + '.')
  }

  return message
}
