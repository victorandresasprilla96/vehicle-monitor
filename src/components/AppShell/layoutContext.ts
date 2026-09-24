import { createContext, useContext } from 'react'

/**
 * Pixels of the map covered by overlaying UI: the mobile bottom sheet (bottom)
 * and the floating status card (left). The map lifts its controls and centres
 * the vehicle in the *visible* area.
 */
export interface MapInsets {
  bottom: number
  left: number
}

export const MapInsetContext = createContext<MapInsets>({ bottom: 0, left: 0 })

export function useMapInsets(): MapInsets {
  return useContext(MapInsetContext)
}
