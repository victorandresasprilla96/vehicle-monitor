import { act, render, screen } from '@testing-library/react'
import { ApiError } from '../../api/errors'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces the message once and focuses Retry', () => {
    render(<ErrorState error={new ApiError('network', 'x')} onRetry={() => {}} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No logramos conectar con el servidor de seguimiento')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toHaveFocus()
  })

  it('retries on its own for transient errors, with the countdown outside the alert', () => {
    vi.useFakeTimers()
    const onRetry = vi.fn()
    render(
      <ErrorState error={new ApiError('timeout', 'x')} onRetry={onRetry} autoRetrySeconds={3} />,
    )

    const countdown = screen.getByText('Reintentaremos automáticamente en 3 s')
    // Not inside the live region: it would otherwise be read out every second
    expect(screen.getByRole('alert')).not.toContainElement(countdown)

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByText('Reintentaremos automáticamente en 1 s')).toBeInTheDocument()
    expect(onRetry).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1000))
    expect(onRetry).toHaveBeenCalledTimes(1)
    // Restarts for the next attempt
    expect(screen.getByText('Reintentaremos automáticamente en 3 s')).toBeInTheDocument()
  })

  it('does not auto-retry wrong credentials', () => {
    vi.useFakeTimers()
    const onRetry = vi.fn()
    render(
      <ErrorState error={new ApiError('auth', 'x', 401)} onRetry={onRetry} autoRetrySeconds={3} />,
    )

    expect(screen.queryByText(/Reintentaremos/)).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(10_000))
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('keeps technical details folded away and never shows server text', () => {
    render(
      <ErrorState
        error={new ApiError('server', 'java.lang.NullPointerException', 503)}
        onRetry={() => {}}
      />,
    )

    const summary = screen.getByText('Detalles técnicos')
    expect(summary.closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('503')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/java/i)
  })

  it('uses an h3 in the compact variant (it lives inside a card with an h2)', () => {
    render(
      <ErrorState
        compact
        error={new ApiError('network', 'x')}
        onRetry={() => {}}
        autoFocus={false}
      />,
    )
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).not.toHaveFocus()
  })

  it('can be the page heading when it is the whole page', () => {
    render(<ErrorState error={new ApiError('network', 'x')} onRetry={() => {}} headingLevel={1} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'No logramos conectar con el servidor de seguimiento',
    )
  })
})
