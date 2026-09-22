import { useEffect, useId, useRef } from 'react'
import { isApiError } from '../../api/errors'
import { errorCopy } from '../../utils/errorCopy'
import { Button } from '../Button/Button'
import styles from './ErrorState.module.css'

interface ErrorStateProps {
  error: unknown
  onRetry: () => void
  retrying?: boolean
  /** Optional secondary way out (e.g. back to login) */
  secondaryAction?: { label: string; onClick: () => void }
  /** Move focus to the retry button when shown (for blocking, full-screen errors) */
  autoFocus?: boolean
}

/**
 * Blocking error with empathetic copy and a clear way forward.
 * role="alert" announces it once; Retry receives focus so keyboard and
 * screen reader users land right on the recovery action.
 */
export function ErrorState({
  error,
  onRetry,
  retrying,
  secondaryAction,
  autoFocus = true,
}: ErrorStateProps) {
  const { title, description } = errorCopy(error)
  const retryRef = useRef<HTMLButtonElement>(null)
  const kind = isApiError(error) ? error.kind : 'unknown'
  const titleId = useId()

  useEffect(() => {
    if (autoFocus) retryRef.current?.focus()
  }, [autoFocus])

  return (
    <div className={styles.errorState} role="alert" aria-labelledby={titleId}>
      <div className={styles.icon} data-kind={kind} aria-hidden="true">
        {kind === 'network' || kind === 'timeout' ? <SignalOffIcon /> : <AlertIcon />}
      </div>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p className={styles.description}>{description}</p>
      <div className={styles.actions}>
        <Button
          ref={retryRef}
          onClick={onRetry}
          loading={retrying}
          loadingLabel="Reintentando…"
          icon={<RetryIcon />}
        >
          Reintentar
        </Button>
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
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
