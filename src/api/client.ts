import { ApiError } from './errors'

export const API_BASE: string = import.meta.env.VITE_API_BASE || '/api'
export const REQUEST_TIMEOUT_MS = 10_000

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** URLSearchParams are sent form-encoded, objects as JSON */
  body?: URLSearchParams | Record<string, unknown>
  query?: Record<string, string | number | undefined>
  /** Cancellation from the caller (e.g. TanStack Query) */
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * Thin fetch wrapper for the Traccar API.
 * - Same-origin /api (proxied) with the session cookie
 * - Timeout combined with the caller's abort signal
 * - Every failure mapped to a typed ApiError
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, timeoutMs = REQUEST_TIMEOUT_MS } = options

  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const headers: Record<string, string> = { Accept: 'application/json' }
  let payload: BodyInit | undefined

  if (body instanceof URLSearchParams) {
    payload = body // fetch sets application/x-www-form-urlencoded
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: payload,
      credentials: 'include',
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    })
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new ApiError('timeout', `Request to ${path} timed out after ${timeoutMs} ms`)
    }
    // Caller cancelled: let it propagate untouched so the query layer ignores it.
    if (signal?.aborted) throw error
    // fetch only rejects on network failure (includes CORS blocks)
    throw new ApiError('network', `Network error calling ${path}`)
  }

  if (!response.ok) {
    const { status } = response
    const kind = status === 401 ? 'auth' : status >= 500 ? 'server' : 'unknown'
    throw new ApiError(kind, `${method} ${path} failed with HTTP ${status}`, status)
  }

  if (response.status === 204) return undefined as T

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('unknown', `Invalid JSON from ${path}`, response.status)
  }
}
