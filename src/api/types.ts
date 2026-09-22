// Subset of the Traccar API models the app uses.
// https://www.traccar.org/api-reference/

export interface User {
  id: number
  name: string
  email: string
  administrator: boolean
  readonly: boolean
}

/** online: reporting · offline: disconnected · unknown: silent for a while */
export type DeviceStatus = 'online' | 'offline' | 'unknown'

export interface Device {
  id: number
  name: string
  uniqueId: string
  status: DeviceStatus
  disabled: boolean
  /** ISO timestamp of the last message received, null if never */
  lastUpdate: string | null
  /** Id of the latest position, 0 if none yet */
  positionId: number
  category: string | null
  model: string | null
}

export interface PositionAttributes {
  /** Battery charge, 0–100 */
  batteryLevel?: number
  motion?: boolean
  ignition?: boolean
  distance?: number
  totalDistance?: number
  [key: string]: unknown
}

export interface Position {
  id: number
  deviceId: number
  /** ISO timestamp when the GPS fix was taken */
  fixTime: string
  deviceTime: string
  serverTime: string
  valid: boolean
  latitude: number
  longitude: number
  altitude: number
  /** Knots */
  speed: number
  /** Heading in degrees, 0 = north, clockwise */
  course: number
  accuracy: number
  address: string | null
  attributes: PositionAttributes
}
