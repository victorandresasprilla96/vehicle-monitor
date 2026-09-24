/** 1 knot = 1.852 km/h (exact, by definition of the nautical mile) */
export const KMH_PER_KNOT = 1.852

export function knotsToKmh(knots: number): number {
  return knots * KMH_PER_KNOT
}

// 16-point compass (Spanish): N, NNE, NE, ENE, E… with O for oeste
const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSO',
  'SO',
  'OSO',
  'O',
  'ONO',
  'NO',
  'NNO',
] as const
const COMPASS_LONG = [
  'norte',
  'nornoreste',
  'noreste',
  'estenoreste',
  'este',
  'estesureste',
  'sureste',
  'sursureste',
  'sur',
  'sursuroeste',
  'suroeste',
  'oestesuroeste',
  'oeste',
  'oestenoroeste',
  'noroeste',
  'nornoroeste',
] as const

/** 0–360° → 16-point compass index (0 = N), 22.5° per point */
function compassIndex(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360
  return Math.round(normalized / 22.5) % 16
}

/** Short Spanish compass point, e.g. 192 → "SSO" */
export function courseToCompass(degrees: number): (typeof COMPASS)[number] {
  return COMPASS[compassIndex(degrees)]
}

/** Spoken form for screen readers, e.g. 192 → "sursuroeste" */
export function courseToCompassLong(degrees: number): (typeof COMPASS_LONG)[number] {
  return COMPASS_LONG[compassIndex(degrees)]
}
