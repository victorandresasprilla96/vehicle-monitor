/** 1 knot = 1.852 km/h (exact, by definition of the nautical mile) */
export const KMH_PER_KNOT = 1.852

export function knotsToKmh(knots: number): number {
  return knots * KMH_PER_KNOT
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const
const COMPASS_LONG = [
  'norte',
  'noreste',
  'este',
  'sureste',
  'sur',
  'suroeste',
  'oeste',
  'noroeste',
] as const

/** 0–360° → 8-point compass index (0 = N) */
function compassIndex(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360
  return Math.round(normalized / 45) % 8
}

/** Short Spanish compass point, e.g. 45 → "NE" */
export function courseToCompass(degrees: number): (typeof COMPASS)[number] {
  return COMPASS[compassIndex(degrees)]
}

/** Spoken form for screen readers, e.g. 45 → "noreste" */
export function courseToCompassLong(degrees: number): (typeof COMPASS_LONG)[number] {
  return COMPASS_LONG[compassIndex(degrees)]
}
