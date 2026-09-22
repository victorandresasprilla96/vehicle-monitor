import type { Device, Position } from '../api/types'

const timeFormat = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const dateTimeFormat = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Absolute timestamp for the card: "14:32:01" when it's from today, otherwise
 * "22 sept, 14:32" — a bare time from days ago would read as fresh data.
 */
export function formatTimestamp(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const sameDay = date.toDateString() === now.toDateString()
  return sameDay ? timeFormat.format(date) : dateTimeFormat.format(date)
}

/**
 * Best "last heard from" time: the GPS fix when there is a position, else the
 * device's last message (it may have connected without ever sending a fix).
 */
export function lastSeen(device: Device, position: Position | null | undefined): string | null {
  return position?.fixTime ?? device.lastUpdate
}
