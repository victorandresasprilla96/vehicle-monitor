import { useMediaQuery } from './useMediaQuery'

/** Live `prefers-reduced-motion` for JS-driven animation (CSS handles its own). */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
