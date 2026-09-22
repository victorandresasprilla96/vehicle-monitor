import { useEffect, useState } from 'react'

export const SLOW_LOADING_MS = 5000

/**
 * True once `active` has stayed true for `ms` (e.g. a load taking too long),
 * so the UI can explain the wait instead of showing a skeleton forever.
 * Resets as soon as `active` turns false.
 */
export function useSlowFlag(active: boolean, ms = SLOW_LOADING_MS): boolean {
  const [timedOut, setTimedOut] = useState(false)
  const [wasActive, setWasActive] = useState(active)

  // Reset during render when the load ends (no setState-in-effect cascade)
  if (wasActive !== active) {
    setWasActive(active)
    if (!active) setTimedOut(false)
  }

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setTimedOut(true), ms)
    return () => window.clearTimeout(timer)
  }, [active, ms])

  return active && timedOut
}
