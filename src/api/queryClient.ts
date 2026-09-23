import { QueryCache, QueryClient } from '@tanstack/react-query'
import { isAuthError, isRetryable } from './errors'
import type { User } from './types'
import { setSessionHint } from '../utils/sessionHint'

export const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 5000
export const DEVICES_POLL_INTERVAL_MS = POLL_INTERVAL_MS * 2

const MAX_RETRIES = 3

export const queryKeys = {
  session: ['session'] as const,
  sessionNotice: ['session', 'notice'] as const,
  devices: ['devices'] as const,
  position: (deviceId: number) => ['position', deviceId] as const,
}

/** Why the user is looking at the login screen, when it wasn't their choice. */
export type SessionNotice = 'expired' | 'logged-out' | null

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      // A 401 on any data query means the session died mid-shift (server restart,
      // cookie expired). Drop to the login screen with an explanation instead of
      // leaving the operator looking at frozen data.
      onError: (error, query) => {
        if (isAuthError(error) && query.queryKey[0] !== queryKeys.session[0]) {
          setSessionHint(false)
          client.setQueryData<SessionNotice>(queryKeys.sessionNotice, 'expired')
          client.setQueryData<User | null>(queryKeys.session, null)
          client.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.session[0] })
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Only transient failures are retried; 401/4xx fail fast.
        retry: (failureCount, error) => isRetryable(error) && failureCount < MAX_RETRIES,
        // 1s, 2s, 4s… capped at 10s
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        refetchOnWindowFocus: true,
        // Polling pauses in background tabs; no requests nobody will see.
        refetchIntervalInBackground: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
  return client
}
