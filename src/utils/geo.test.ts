import {
  distanceMeters,
  easeOutCubic,
  lerpAngle,
  lerpLatLng,
  normalizeDegrees,
  shortestAngleDelta,
} from './geo'

describe('distanceMeters', () => {
  it('is 0 for the same point', () => {
    expect(distanceMeters({ lat: 40.4, lng: -3.7 }, { lat: 40.4, lng: -3.7 })).toBe(0)
  })

  it('matches a known distance (Puerta del Sol → Plaza de España ≈ 1 km)', () => {
    const d = distanceMeters({ lat: 40.4169, lng: -3.7035 }, { lat: 40.4233, lng: -3.7122 })
    expect(d).toBeGreaterThan(1000)
    expect(d).toBeLessThan(1100)
  })

  it('1° of latitude ≈ 111 km', () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) / 1000).toBeCloseTo(111.19, 1)
  })
})

describe('shortestAngleDelta', () => {
  it.each([
    [0, 90, 90],
    [90, 0, -90],
    [350, 10, 20],
    [10, 350, -20],
    [0, 180, 180],
    [180, 0, 180],
    [720, 45, 45],
    [-90, 90, 180],
  ])('%d° → %d° = %d°', (from, to, delta) => {
    expect(shortestAngleDelta(from, to)).toBe(delta)
  })
})

describe('lerpAngle', () => {
  it('crosses north the short way', () => {
    expect(lerpAngle(350, 10, 0.5)).toBe(360) // i.e. 0°, via +10°
    expect(normalizeDegrees(lerpAngle(350, 10, 0.5))).toBe(0)
  })

  it('reaches the target at t = 1', () => {
    expect(normalizeDegrees(lerpAngle(10, 350, 1))).toBe(350)
  })
})

describe('lerpLatLng', () => {
  it('interpolates both axes', () => {
    expect(lerpLatLng({ lat: 0, lng: 0 }, { lat: 10, lng: -20 }, 0.25)).toEqual({
      lat: 2.5,
      lng: -5,
    })
  })
})

describe('easeOutCubic', () => {
  it('starts at 0, ends at 1, and front-loads the motion', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})
