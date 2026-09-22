import type { Device, Position } from '../api/types'
import { formatTimestamp, lastSeen } from './format'

describe('formatTimestamp', () => {
  const now = new Date(2026, 8, 22, 18, 0, 0) // 22 Sep 2026, 18:00 local

  it('shows only the time for today', () => {
    expect(formatTimestamp(new Date(2026, 8, 22, 14, 32, 1).toISOString(), now)).toBe('14:32:01')
  })

  it('adds the date when it is not from today', () => {
    const formatted = formatTimestamp(new Date(2026, 8, 20, 9, 5, 0).toISOString(), now)
    expect(formatted).toMatch(/20/)
    expect(formatted).toMatch(/sept/)
    expect(formatted).toMatch(/09:05/)
  })
})

describe('lastSeen', () => {
  const device = { lastUpdate: '2026-09-22T10:00:00Z' } as Device

  it('prefers the GPS fix time', () => {
    const position = { fixTime: '2026-09-22T11:00:00Z' } as Position
    expect(lastSeen(device, position)).toBe('2026-09-22T11:00:00Z')
  })

  it('falls back to the device last message when there is no position', () => {
    expect(lastSeen(device, null)).toBe('2026-09-22T10:00:00Z')
  })

  it('is null when the device never reported', () => {
    expect(lastSeen({ lastUpdate: null } as Device, undefined)).toBeNull()
  })
})
