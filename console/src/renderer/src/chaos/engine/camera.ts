import type { Pt, Rect } from '../types'

/** Maps world units to screen CSS px. z = screen px per world unit.
 *  World is laid out at panel CSS size, so the fitted camera is identity (z = 1). */
export class Camera {
  x = 0
  y = 0
  z = 1
  vw = 1
  vh = 1

  setViewport(vw: number, vh: number): void {
    this.vw = Math.max(1, vw)
    this.vh = Math.max(1, vh)
  }

  fitWorld(w: number, h: number): void {
    this.z = Math.min(this.vw / Math.max(1, w), this.vh / Math.max(1, h))
    this.x = w / 2
    this.y = h / 2
  }

  worldToScreen(wx: number, wy: number): Pt {
    return { x: (wx - this.x) * this.z + this.vw / 2, y: (wy - this.y) * this.z + this.vh / 2 }
  }

  screenToWorld(sx: number, sy: number): Pt {
    return { x: (sx - this.vw / 2) / this.z + this.x, y: (sy - this.vh / 2) / this.z + this.y }
  }

  viewRect(): Rect {
    return {
      x: this.x - this.vw / 2 / this.z,
      y: this.y - this.vh / 2 / this.z,
      w: this.vw / this.z,
      h: this.vh / this.z
    }
  }
}
