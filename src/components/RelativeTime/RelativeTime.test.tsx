import { act, render, screen } from '@testing-library/react'
import { RelativeTime } from './RelativeTime'

describe('RelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-22T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('shows relative + exact time and keeps counting on its own', () => {
    render(<RelativeTime iso="2026-09-22T11:59:55Z" />)
    const time = screen.getByText('Ahora').closest('time')
    expect(time).toHaveAttribute('dateTime', '2026-09-22T11:59:55Z')

    act(() => vi.advanceTimersByTime(20_000))
    expect(screen.getByText('Hace 25 s')).toBeInTheDocument()
  })

  it('flags data older than 2 minutes, also for screen readers', () => {
    render(<RelativeTime iso="2026-09-22T11:55:00Z" />)
    const time = screen.getByText(/Hace 5 min/).closest('time')
    expect(time).toHaveAttribute('data-old')
    expect(time).toHaveTextContent('(datos antiguos)')
  })
})
