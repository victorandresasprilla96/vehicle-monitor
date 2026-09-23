import clsx from 'clsx'
import { useEffect, useId, useRef, useState } from 'react'
import { isApiError, isRetryable } from '../../api/errors'
import { errorCopy } from '../../utils/errorCopy'
import { Button } from '../Button/Button'
import styles from './ErrorState.module.css'

interface ErrorStateProps {
  error: unknown
  onRetry: () => void
  retrying?: boolean
  /** Optional secondary way out (e.g. back to login) */
  secondaryAction?: { label: string; onClick: () => void }
  /** Move focus to the retry button when shown (for blocking errors) */
  autoFocus?: boolean
  /** Smaller variant for use inside a card; heading becomes h3 */
  compact?: boolean
  /** What failed to load, e.g. "la posición del vehículo" */
  context?: string
  /**
   * Seconds before retrying on its own, for transient errors only.
   * Control-room screens are often unattended: they should heal themselves.
   */
  autoRetrySeconds?: number
  /** Heading level: 1 when the error *is* the page (full-screen), 2 by default, 3 when compact */
  headingLevel?: 1 | 2 | 3
}

/**
 * Error with empathetic copy and a clear way forward.
 * Only the message is inside role="alert" (announced once); the countdown
 * lives outside it so screen readers aren't told the time every second.
 */
export function ErrorState({
  error,
  onRetry,
  retrying = false,
  secondaryAction,
  autoFocus = true,
  compact = false,
  context,
  autoRetrySeconds,
  headingLevel,
}: ErrorStateProps) {
  const { title, description } = errorCopy(error)
  const retryRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const kind = isApiError(error) ? error.kind : 'unknown'
  const status = isApiError(error) ? error.status : null
  const Heading = `h${headingLevel ?? (compact ? 3 : 2)}` as 'h1' | 'h2' | 'h3'
  // When the error was first shown, for the technical details
  const [shownAt] = useState(() => new Date())

  const autoRetry = isRetryable(error) ? autoRetrySeconds : undefined
  // Each finished attempt remounts the countdown (new key) = fresh period.
  const [attempt, setAttempt] = useState(0)
  const [wasRetrying, setWasRetrying] = useState(retrying)
  if (wasRetrying !== retrying) {
    setWasRetrying(retrying)
    if (!retrying) setAttempt((a) => a + 1)
  }

  useEffect(() => {
    if (autoFocus) retryRef.current?.focus()
  }, [autoFocus])

  return (
    <div className={clsx(styles.errorState, compact && styles.compact)}>
      <div className={styles.icon} data-kind={kind} aria-hidden="true">
        {kind === 'network' || kind === 'timeout' ? <SignalOffIcon /> : <AlertIcon />}
      </div>

      <div role="alert" aria-labelledby={titleId} className={styles.message}>
        {context && <p className={styles.context}>No hemos podido cargar {context}</p>}
        <Heading id={titleId} className={styles.title}>
          {title}
        </Heading>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.actions}>
        <Button
          ref={retryRef}
          onClick={onRetry}
          loading={retrying}
          loadingLabel="Reintentando…"
          icon={<RetryIcon />}
          variant={compact ? 'secondary' : 'primary'}
        >
          Reintentar
        </Button>
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>

      {autoRetry && !retrying && (
        <AutoRetryCountdown key={attempt} seconds={autoRetry} onElapsed={onRetry} />
      )}

      {!compact && (
        <details className={styles.details}>
          <summary>Detalles técnicos</summary>
          <dl>
            <div>
              <dt>Tipo</dt>
              <dd>{kind}</dd>
            </div>
            {status !== null && (
              <div>
                <dt>HTTP</dt>
                <dd>{status}</dd>
              </div>
            )}
            <div>
              <dt>Hora</dt>
              <dd>
                <time dateTime={shownAt.toISOString()}>{shownAt.toLocaleTimeString('es-ES')}</time>
              </dd>
            </div>
          </dl>
        </details>
      )}
    </div>
  )
}

/**
 * Visible countdown that calls onElapsed at 0 and starts over. Kept outside the
 * alert region by the parent; remounted (via key) after every attempt.
 */
function AutoRetryCountdown({ seconds, onElapsed }: { seconds: number; onElapsed: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const onElapsedRef = useRef(onElapsed)

  useEffect(() => {
    onElapsedRef.current = onElapsed
  }, [onElapsed])

  useEffect(() => {
    let left = seconds
    const timer = window.setInterval(() => {
      left -= 1
      if (left <= 0) {
        onElapsedRef.current()
        // Start over even if the caller doesn't report `retrying`
        left = seconds
      }
      setRemaining(left)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  return <p className={styles.countdown}>Reintentaremos automáticamente en {remaining} s</p>
}

function SignalOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8M5 12.9a10 10 0 0 1 5.2-2.7M17.7 11.5c.5.4.9.9 1.3 1.4M8.5 16.4a5 5 0 0 1 7 0" />
      <circle cx="12" cy="20" r="0.9" fill="currentColor" />
      <path d="m3 3 18 18" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

function RetryIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
    </svg>
  )
}
