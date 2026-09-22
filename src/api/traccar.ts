import { request } from './client'
import { ApiError } from './errors'
import type { Device, Position, User } from './types'

/** POST /api/session — Traccar expects a form-encoded body, not JSON. */
export function login(email: string, password: string, signal?: AbortSignal): Promise<User> {
  return request<User>('/session', {
    method: 'POST',
    body: new URLSearchParams({ email, password }),
    signal,
  })
}

/**
 * GET /api/session — restores the session from the cookie.
 * Traccar answers 404 when there is no session: that's "logged out", not an error.
 */
export async function getSession(signal?: AbortSignal): Promise<User | null> {
  try {
    return await request<User>('/session', { signal })
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.kind === 'auth')) return null
    throw error
  }
}

/** DELETE /api/session */
export function logout(): Promise<void> {
  return request<void>('/session', { method: 'DELETE' })
}

/** GET /api/devices */
export function getDevices(signal?: AbortSignal): Promise<Device[]> {
  return request<Device[]>('/devices', { signal })
}

/** GET /api/positions?deviceId= — latest position of the device, or null if it never reported. */
export async function getLatestPosition(
  deviceId: number,
  signal?: AbortSignal,
): Promise<Position | null> {
  const positions = await request<Position[]>('/positions', { query: { deviceId }, signal })
  return positions[0] ?? null
}
