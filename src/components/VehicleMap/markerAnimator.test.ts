import { normalizeDegrees } from '../../utils/geo'
import { MarkerAnimator, type MarkerState } from './markerAnimator'

/** Deterministic clock + frame queue. */
function fakeFrames() {
  let time = 0
  let nextId = 1
  const queue = new Map<number, FrameRequestCallback>()
  return {
    now: () => time,
    requestFrame: (cb: FrameRequestCallback) => {
      const id = nextId++
      queue.set(id, cb)
      return id
    },
    cancelFrame: (id: number) => queue.delete(id),
    /** Advance time and run the frames queued so far, like the browser would. */
    advance(ms: number, step = 16) {
      for (let elapsed = 0; elapsed < ms; elapsed += step) {
        time += step
        const due = [...queue.entries()]
        queue.clear()
        due.forEach(([, cb]) => cb(time))
      }
    },
    get pending() {
      return queue.size
    },
  }
}

const SOL = { lat: 40.4169, lng: -3.7035 }
const GRAN_VIA = { lat: 40.4199, lng: -3.7016 } // ~370 m away
const BARCELONA = { lat: 41.3874, lng: 2.1686 } // ~500 km away

function setup(durationMs = 1000) {
  const frames = fakeFrames()
  const applied: MarkerState[] = []
  const animator = new MarkerAnimator((s) => applied.push(s), { durationMs, ...frames })
  return { animator, applied, frames, last: () => applied[applied.length - 1] }
}

describe('MarkerAnimator', () => {
  it('places the first fix immediately (nothing to animate from)', () => {
    const { animator, applied, frames } = setup()
    animator.moveTo({ position: SOL, heading: 45 })
    expect(applied).toEqual([{ position: SOL, heading: 45 }])
    expect(frames.pending).toBe(0)
  })

  it('glides to the next fix and lands exactly on it', () => {
    const { animator, frames, last } = setup(1000)
    animator.moveTo({ position: SOL, heading: 0 })
    animator.moveTo({ position: GRAN_VIA, heading: 30 })

    frames.advance(500)
    const mid = last()
    expect(mid.position.lat).toBeGreaterThan(SOL.lat)
    expect(mid.position.lat).toBeLessThan(GRAN_VIA.lat)
    // ease-out: more than half the way at half the time
    expect((mid.position.lat - SOL.lat) / (GRAN_VIA.lat - SOL.lat)).toBeGreaterThan(0.5)

    frames.advance(600)
    expect(last()).toEqual({ position: GRAN_VIA, heading: 30 })
    expect(animator.isAnimating).toBe(false)
  })

  it('rotates across north the short way', () => {
    const { animator, frames, applied } = setup(1000)
    animator.moveTo({ position: SOL, heading: 350 })
    animator.moveTo({ position: GRAN_VIA, heading: 10 })
    frames.advance(1100)

    const headings = applied.map((s) => s.heading)
    // Never passes through 180° (the long way round)
    expect(headings.every((h) => h >= 350 && h <= 370)).toBe(true)
    expect(normalizeDegrees(headings[headings.length - 1])).toBe(10)
  })

  it('retargets mid-flight from the current on-screen position (no snap back)', () => {
    const { animator, frames, applied, last } = setup(1000)
    animator.moveTo({ position: SOL, heading: 0 })
    animator.moveTo({ position: GRAN_VIA, heading: 0 })
    frames.advance(400)
    const atRetarget = last().position

    const nextFix = { lat: 40.421, lng: -3.705 }
    animator.moveTo({ position: nextFix, heading: 0 })
    frames.advance(16)
    const firstAfter = applied[applied.length - 1].position
    // Continues from where it was, not from SOL or GRAN_VIA
    expect(Math.abs(firstAfter.lat - atRetarget.lat)).toBeLessThan(0.0005)

    frames.advance(1100)
    expect(last().position).toEqual(nextFix)
  })

  it('jumps instead of animating implausibly long moves', () => {
    const { animator, applied, frames } = setup()
    animator.moveTo({ position: SOL, heading: 0 })
    animator.moveTo({ position: BARCELONA, heading: 90 })
    expect(applied[applied.length - 1]).toEqual({ position: BARCELONA, heading: 90 })
    expect(frames.pending).toBe(0)
  })

  it('jumps when animation is disabled (reduced motion, device switch)', () => {
    const { animator, applied, frames } = setup()
    animator.moveTo({ position: SOL, heading: 0 })
    animator.moveTo({ position: GRAN_VIA, heading: 90 }, { animate: false })
    expect(applied[applied.length - 1]).toEqual({ position: GRAN_VIA, heading: 90 })
    expect(frames.pending).toBe(0)
  })

  it('stop() cancels the pending frame', () => {
    const { animator, frames } = setup()
    animator.moveTo({ position: SOL, heading: 0 })
    animator.moveTo({ position: GRAN_VIA, heading: 0 })
    expect(frames.pending).toBe(1)
    animator.stop()
    expect(frames.pending).toBe(0)
    expect(animator.isAnimating).toBe(false)
  })
})
