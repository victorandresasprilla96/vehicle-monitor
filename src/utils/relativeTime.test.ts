import { formatRelative } from './relativeTime'

const NOW = new Date('2026-09-22T12:00:00Z').getTime()
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

describe('formatRelative', () => {
  it.each([
    [0, 'Hace unos segundos'],
    [9, 'Hace unos segundos'],
    [10, 'Hace 10 segundos'],
    [59, 'Hace 59 segundos'],
    [60, 'Hace 1 minuto'],
    [150, 'Hace 2 minutos'],
    [3600, 'Hace 1 hora'],
    [7300, 'Hace 2 horas'],
    [86_400 * 3, 'Hace 3 días'],
  ])('%d s ago → "%s"', (seconds, text) => {
    expect(formatRelative(ago(seconds), NOW)).toBe(text)
  })

  it('never shows the future (clock skew between device and browser)', () => {
    expect(formatRelative(ago(-30), NOW)).toBe('Hace unos segundos')
  })
})
