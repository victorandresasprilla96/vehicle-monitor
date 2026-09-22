export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** Linear interpolation between two coordinates (fine at street scale). */
export function lerpLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  return { lat: lerp(from.lat, to.lat, t), lng: lerp(from.lng, to.lng, t) }
}

/** Normalise any angle to [0, 360). */
export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/**
 * Signed shortest rotation from `from` to `to`, in (-180, 180].
 * 350° → 10° is +20°, not −340°: the arrow never spins the long way round.
 */
export function shortestAngleDelta(from: number, to: number): number {
  const delta = normalizeDegrees(to - from)
  return delta > 180 ? delta - 360 : delta
}

/** Interpolates heading along the shortest arc. Result is not normalised (keeps CSS rotation continuous). */
export function lerpAngle(from: number, to: number, t: number): number {
  return from + shortestAngleDelta(from, to) * t
}

/** Fast start, gentle stop: reads as a vehicle arriving, not a UI sliding. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}
