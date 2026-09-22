import { distanceMeters, easeOutCubic, lerpAngle, lerpLatLng, type LatLng } from '../../utils/geo'

export interface MarkerState {
  position: LatLng
  /** Degrees, not normalised (keeps CSS rotation continuous across north) */
  heading: number
}

export interface AnimatorOptions {
  durationMs?: number
  /** Jumps longer than this are shown as a jump: animating would draw a path the vehicle never drove */
  teleportMeters?: number
  easing?: (t: number) => number
  /** Injectable for tests */
  now?: () => number
  requestFrame?: (cb: FrameRequestCallback) => number
  cancelFrame?: (id: number) => void
}

export const MARKER_ANIMATION_MS = 1500
export const TELEPORT_METERS = 2000

/**
 * Glides a marker between GPS fixes with requestAnimationFrame.
 * Framework-free: it only calls `apply` with the interpolated state, so the
 * caller can write straight to Leaflet/DOM without re-rendering React per frame.
 * A new target mid-flight starts from where the marker *is*, never snapping back.
 */
export class MarkerAnimator {
  private state: MarkerState | null = null
  private frame: number | null = null
  private readonly apply: (state: MarkerState) => void
  private readonly durationMs: number
  private readonly teleportMeters: number
  private readonly easing: (t: number) => number
  private readonly now: () => number
  private readonly requestFrame: (cb: FrameRequestCallback) => number
  private readonly cancelFrame: (id: number) => void

  constructor(apply: (state: MarkerState) => void, options: AnimatorOptions = {}) {
    this.apply = apply
    this.durationMs = options.durationMs ?? MARKER_ANIMATION_MS
    this.teleportMeters = options.teleportMeters ?? TELEPORT_METERS
    this.easing = options.easing ?? easeOutCubic
    this.now = options.now ?? (() => performance.now())
    this.requestFrame = options.requestFrame ?? ((cb) => window.requestAnimationFrame(cb))
    this.cancelFrame = options.cancelFrame ?? ((id) => window.cancelAnimationFrame(id))
  }

  get current(): MarkerState | null {
    return this.state
  }

  get isAnimating(): boolean {
    return this.frame !== null
  }

  /** Move to a new fix. `animate: false` (first fix, reduced motion, device switch) jumps. */
  moveTo(target: MarkerState, { animate = true }: { animate?: boolean } = {}): void {
    this.stop()
    const from = this.state

    const shouldJump =
      !animate ||
      from === null ||
      this.durationMs <= 0 ||
      distanceMeters(from.position, target.position) > this.teleportMeters

    if (shouldJump) {
      this.set(target)
      return
    }

    const start = this.now()
    const tick = () => {
      const t = Math.min(1, (this.now() - start) / this.durationMs)
      const k = this.easing(t)
      this.set({
        position: lerpLatLng(from.position, target.position, k),
        heading: lerpAngle(from.heading, target.heading, k),
      })
      this.frame = t < 1 ? this.requestFrame(tick) : null
    }
    this.frame = this.requestFrame(tick)
  }

  stop(): void {
    if (this.frame !== null) this.cancelFrame(this.frame)
    this.frame = null
  }

  private set(state: MarkerState) {
    this.state = state
    this.apply(state)
  }
}
