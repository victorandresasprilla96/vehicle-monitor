/**
 * Every failure the UI can meet is normalised into an ApiError with a `kind`,
 * so components pick copy and recovery actions without parsing messages.
 * Traccar error bodies are Java stack traces: they are never shown to users.
 */
export type ApiErrorKind =
  /** 401 — bad credentials or expired session */
  | 'auth'
  /** Request never reached the server: offline, DNS, CORS blocked, server down */
  | 'network'
  /** Server didn't answer within the time budget */
  | 'timeout'
  /** 5xx */
  | 'server'
  /** Other unexpected HTTP status or malformed response */
  | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isAuthError(error: unknown): boolean {
  return isApiError(error) && error.kind === 'auth'
}

/** Errors worth retrying automatically (transient by nature) */
export function isRetryable(error: unknown): boolean {
  return isApiError(error) && ['network', 'timeout', 'server'].includes(error.kind)
}
