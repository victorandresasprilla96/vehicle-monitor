const KEY = 'vm-fleet-size'

/**
 * How many vehicles the last session had, so the loading skeleton can draw the
 * vehicle list with the right number of rows (no layout shift when it loads).
 */
export function readFleetSize(): number | null {
  try {
    const n = Number(localStorage.getItem(KEY))
    return Number.isInteger(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function storeFleetSize(n: number): void {
  try {
    localStorage.setItem(KEY, String(n))
  } catch {
    // storage unavailable: first-load skeleton just falls back to the select shape
  }
}
