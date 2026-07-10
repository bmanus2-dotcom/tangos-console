import { clamp } from './anim'
import type { Camera } from './camera'
import type { Rect } from '../types'

/** Cursor-driven ripples: each impulse is a traveling gaussian ring that fades out.
 *  Impulses live in world space; per frame they are snapshotted to screen space so
 *  the per-tile lift math is a couple of exp() calls with no allocation. */

export interface RippleSnap {
  sx: number
  sy: number
  waveR: number
  amp: number
}

interface Impulse {
  wx: number
  wy: number
  t0: number
  amp: number
}

const MAX_IMPULSES = 8
const EMIT_EVERY_MS = 40
const LIFE_MS = 1000
const WAVE_SPEED = 240 // ring speed, screen px per second
const WAVE_SIGMA = 26 // ring thickness, screen px
const DECAY = 3.5

export class RippleField {
  private impulses: Impulse[] = []
  private lastEmit = 0

  emit(wx: number, wy: number, speedPxPerSec: number, now: number): void {
    if (now - this.lastEmit < EMIT_EVERY_MS) return
    this.lastEmit = now
    this.impulses.push({ wx, wy, t0: now, amp: clamp(speedPxPerSec / 600, 0.15, 1) })
    if (this.impulses.length > MAX_IMPULSES) this.impulses.shift()
  }

  /** Prune dead impulses. Returns whether any are still alive. */
  step(now: number): boolean {
    if (this.impulses.length && now - this.impulses[0].t0 >= LIFE_MS) {
      this.impulses = this.impulses.filter((i) => now - i.t0 < LIFE_MS)
    }
    return this.impulses.length > 0
  }

  clear(): void {
    this.impulses.length = 0
  }

  snapshot(cam: Camera, now: number): RippleSnap[] {
    const out: RippleSnap[] = []
    for (const im of this.impulses) {
      const age = (now - im.t0) / 1000
      const p = cam.worldToScreen(im.wx, im.wy)
      out.push({ sx: p.x, sy: p.y, waveR: WAVE_SPEED * age, amp: im.amp * Math.exp(-DECAY * age) })
    }
    return out
  }
}

/** Screen-space bounding rect covering every live ring. */
export function rippleBounds(snaps: RippleSnap[]): Rect {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const s of snaps) {
    const r = s.waveR + WAVE_SIGMA * 3
    x0 = Math.min(x0, s.sx - r)
    y0 = Math.min(y0, s.sy - r)
    x1 = Math.max(x1, s.sx + r)
    y1 = Math.max(y1, s.sy + r)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Total lift [0,1] at a screen point. */
export function rippleLift(snaps: RippleSnap[], sx: number, sy: number): number {
  let lift = 0
  for (const s of snaps) {
    const front = Math.hypot(sx - s.sx, sy - s.sy) - s.waveR
    lift += s.amp * Math.exp(-(front * front) / (2 * WAVE_SIGMA * WAVE_SIGMA))
  }
  return lift > 1 ? 1 : lift
}
