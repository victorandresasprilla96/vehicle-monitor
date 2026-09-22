import { useQuery } from '@tanstack/react-query'
import { DEVICES_POLL_INTERVAL_MS, queryKeys } from '../api/queryClient'
import { getDevices } from '../api/traccar'
import type { Device } from '../api/types'

const byName = (a: Device, b: Device) => a.name.localeCompare(b.name, 'es', { numeric: true })

/**
 * Device list, polled so connection status (online/offline/unknown) stays live.
 * Sorted by name with natural ordering ("Camión 2" before "Camión 10").
 */
export function useDevices(enabled = true) {
  return useQuery({
    queryKey: queryKeys.devices,
    queryFn: ({ signal }) => getDevices(signal),
    select: (devices) => devices.filter((d) => !d.disabled).sort(byName),
    refetchInterval: DEVICES_POLL_INTERVAL_MS,
    enabled,
  })
}
