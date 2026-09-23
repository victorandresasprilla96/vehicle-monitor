import { useCallback, useSyncExternalStore } from 'react'

/** Live result of a CSS media query. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/**
 * Panel beside the map (instead of stacked below it): wide screens, and short
 * landscape screens (phone on its side, 200 % browser zoom) where stacking
 * would push the vehicle data below the fold.
 * Keep in sync with the same query in AppShell.module.css.
 */
export const SIDE_BY_SIDE_QUERY =
  '(min-width: 60rem), (orientation: landscape) and (min-width: 40rem) and (max-height: 32rem)'
