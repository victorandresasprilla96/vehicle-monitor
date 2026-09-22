import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/**
 * Browser connectivity as TanStack Query sees it. While offline, queries are
 * *paused* (not failed), so "offline" must be detected here, not via isError.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  )
}
