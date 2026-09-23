import { createContext, useContext } from 'react'

/**
 * Pixels of the map covered at the bottom by overlaying UI (the mobile
 * bottom sheet). The map lifts its controls and centres the vehicle in the
 * visible area above it.
 */
export const MapInsetContext = createContext(0)

export function useMapBottomInset(): number {
  return useContext(MapInsetContext)
}
