import { courseToCompass, courseToCompassLong, knotsToKmh } from './units'

describe('knotsToKmh', () => {
  it.each([
    [0, 0],
    [1, 1.852],
    [10, 18.52],
    [54, 100.008],
  ])('%d kn → %d km/h', (knots, kmh) => {
    expect(knotsToKmh(knots)).toBeCloseTo(kmh, 6)
  })
})

describe('courseToCompass (16 points)', () => {
  it.each([
    [0, 'N'],
    [11, 'N'],
    [12, 'NNE'],
    [45, 'NE'],
    [90, 'E'],
    [180, 'S'],
    [192, 'SSO'],
    [225, 'SO'],
    [270, 'O'],
    [292.5, 'ONO'],
    [340, 'NNO'],
    [349, 'N'],
    [355, 'N'],
    [360, 'N'],
    [-90, 'O'],
  ])('%d° → %s', (degrees, point) => {
    expect(courseToCompass(degrees)).toBe(point)
  })

  it('has a spoken form for screen readers', () => {
    expect(courseToCompassLong(45)).toBe('noreste')
    expect(courseToCompassLong(192)).toBe('sursuroeste')
  })
})
