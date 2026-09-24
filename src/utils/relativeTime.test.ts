import { formatRelative } from './relativeTime'

const NOW = new Date('2026-09-22T12:00:00Z').getTime()
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

describe('formatRelative', () => {
  it.each([
    [0, 'Ahora'],
    [9, 'Ahora'],
    [10, 'Hace 10 s'],
    [59, 'Hace 59 s'],
    [60, 'Hace 1 min'],
    [150, 'Hace 2 min'],
    [3600, 'Hace 1 h'],
    [7300, 'Hace 2 h'],
    [86_400 * 3, 'Hace 3 d'],
  ])('%d s ago → "%s"', (seconds, text) => {
    expect(formatRelative(ago(seconds), NOW)).toBe(text)
  })

  it('never shows the future (clock skew between device and browser)', () => {
    expect(formatRelative(ago(-30), NOW)).toBe('Ahora')
  })
})
