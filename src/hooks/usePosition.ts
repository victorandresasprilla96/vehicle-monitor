import { useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS, queryKeys } from '../api/queryClient'
import { getLatestPosition } from '../api/traccar'

/**
 * Latest position of the selected device, polled every POLL_INTERVAL_MS.
 * On a failed poll the last good position stays in `data` (with `isError`
 * true), so the UI can flag stale data instead of blanking the card.
 */
export function usePosition(deviceId: number | null) {
  return useQuery({
    queryKey: queryKeys.position(deviceId ?? -1),
    queryFn: ({ signal }) => getLatestPosition(deviceId!, signal),
    enabled: deviceId !== null,
    refetchInterval: POLL_INTERVAL_MS,
  })
}
