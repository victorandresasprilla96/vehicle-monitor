import { renderHook } from '@testing-library/react'
import type { Device, Position } from '../api/types'
import { useVehicleAnnouncements } from './useVehicleAnnouncements'

const device = (overrides: Partial<Device> = {}): Device => ({
  id: 7,
  name: 'Camión 01',
  uniqueId: 'abc',
  status: 'online',
  disabled: false,
  lastUpdate: null,
  positionId: 1,
  category: null,
  model: null,
  ...overrides,
})

const KN = 1.852
const position = (kmh: number, battery = 80): Position => ({
  id: 1,
  deviceId: 7,
  fixTime: '2026-09-22T12:00:00Z',
  deviceTime: '2026-09-22T12:00:00Z',
  serverTime: '2026-09-22T12:00:00Z',
  valid: true,
  latitude: 40.4,
  longitude: -3.7,
  altitude: 0,
  speed: kmh / KN,
  course: 0,
  accuracy: 0,
  address: null,
  attributes: { batteryLevel: battery },
})

function setup(initialDevice: Device | null, initialPosition: Position | null | undefined) {
  return renderHook(({ d, p }) => useVehicleAnnouncements(d, p), {
    initialProps: { d: initialDevice, p: initialPosition },
  })
}

describe('useVehicleAnnouncements', () => {
  it('stays silent on first load and on small changes', () => {
    const { result, rerender } = setup(device(), position(30))
    expect(result.current).toBe('')

    rerender({ d: device(), p: position(38) })
    rerender({ d: device(), p: position(25) })
    expect(result.current).toBe('')
  })

  it('announces a connection status change', () => {
    const { result, rerender } = setup(device(), position(30))
    rerender({ d: device({ status: 'offline' }), p: position(30) })
    expect(result.current).toBe('Camión 01: sin conexión.')
  })

  it('announces stopping and starting', () => {
    const { result, rerender } = setup(device(), position(30))
    rerender({ d: device(), p: position(0) })
    expect(result.current).toBe('Camión 01 se ha detenido.')

    rerender({ d: device(), p: position(15) })
    expect(result.current).toBe('Camión 01 se ha puesto en marcha.')
  })

  it('announces only large speed changes, measured from the last announced value', () => {
    const { result, rerender } = setup(device(), position(30))
    rerender({ d: device(), p: position(45) }) // +15: silent
    expect(result.current).toBe('')
    rerender({ d: device(), p: position(52) }) // +22 from 30: speak
    expect(result.current).toBe('Velocidad 52 km/h.')
    rerender({ d: device(), p: position(60) }) // +8 from 52: keep last message, no new one
    expect(result.current).toBe('Velocidad 52 km/h.')
  })

  it('announces battery crossing into low and critical, once each', () => {
    const { result, rerender } = setup(device(), position(30, 25))
    rerender({ d: device(), p: position(30, 19) })
    expect(result.current).toBe('Batería baja: 19 %.')
    rerender({ d: device(), p: position(30, 15) })
    expect(result.current).toBe('Batería baja: 19 %.') // unchanged, not repeated
    rerender({ d: device(), p: position(30, 9) })
    expect(result.current).toBe('Batería crítica: 9 %.')
  })

  it('resets silently when switching vehicle', () => {
    const { result, rerender } = setup(device(), position(30))
    rerender({ d: device({ status: 'offline' }), p: position(30) })
    expect(result.current).not.toBe('')

    rerender({ d: device({ id: 8, name: 'Camión 02', status: 'online' }), p: position(80) })
    expect(result.current).toBe('')
  })

  it('does not speak when the first position arrives after loading', () => {
    const { result, rerender } = setup(device(), undefined)
    rerender({ d: device(), p: position(50) })
    expect(result.current).toBe('')
  })
})
