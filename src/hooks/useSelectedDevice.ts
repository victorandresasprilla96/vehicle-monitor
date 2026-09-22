import { useCallback, useSyncExternalStore } from 'react'

const PARAM = 'device'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

function readDeviceId(): number | null {
  const value = new URLSearchParams(window.location.search).get(PARAM)
  const id = value ? Number(value) : NaN
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Selected device id, stored in the URL (?device=123) so a view can be
 * reloaded, bookmarked or shared between operators.
 */
export function useSelectedDevice(): [number | null, (id: number | null) => void] {
  const deviceId = useSyncExternalStore(subscribe, readDeviceId)

  const setDeviceId = useCallback((id: number | null) => {
    const url = new URL(window.location.href)
    if (id === null) url.searchParams.delete(PARAM)
    else url.searchParams.set(PARAM, String(id))
    window.history.replaceState(null, '', url)
    // replaceState doesn't emit popstate; notify subscribers ourselves.
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  return [deviceId, setDeviceId]
}
