import { clamp, easeOutBack } from './anim'
import type { Camera } from './camera'

/** Hover name bubble: pops in over the hovered module/function, retargets with a
 *  quicker pop, fades out on leave. Drawn in screen space so zoom never scales it. */

const FONT = '600 11px "Segoe UI", system-ui, sans-serif'
const POP_MS = 150
const RETARGET_MS = 80
const FADE_MS = 100
const H = 22
const NOTCH = 6
const PAD_X = 8
const MARGIN = 8

export class NameBubble {
  private text = ''
  private wx = 0
  private wy = 0
  private shownAt = -1e9
  private hiddenAt = -1e9
  private visible = false
  private popMs = POP_MS
  private readonly widths = new Map<string, number>()

  /** The text currently targeted, '' when hidden or fading out. */
  get currentText(): string {
    return this.visible ? this.text : ''
  }

  show(text: string, wx: number, wy: number, now: number): void {
    if (this.visible && this.text === text) return
    this.popMs = this.visible ? RETARGET_MS : POP_MS
    this.text = text
    this.wx = wx
    this.wy = wy
    this.shownAt = now
    this.visible = true
  }

  hide(now: number): void {
    if (!this.visible) return
    this.visible = false
    this.hiddenAt = now
  }

  needsFrame(now: number): boolean {
    if (this.visible) return now - this.shownAt < this.popMs + 40
    return now - this.hiddenAt < FADE_MS + 40
  }

  /** ctx transform must map CSS px (dpr already applied). */
  draw(ctx: CanvasRenderingContext2D, cam: Camera, now: number): void {
    let scale: number
    let alpha: number
    if (this.visible) {
      const k = clamp((now - this.shownAt) / this.popMs, 0, 1)
      scale = 0.55 + 0.45 * easeOutBack(k)
      alpha = clamp((now - this.shownAt) / 100, 0, 1)
    } else {
      const k = clamp((now - this.hiddenAt) / FADE_MS, 0, 1)
      if (k >= 1) return
      scale = 1 - 0.15 * k
      alpha = 1 - k
    }
    ctx.font = FONT
    let tw = this.widths.get(this.text)
    if (tw == null) {
      if (this.widths.size > 512) this.widths.clear()
      tw = ctx.measureText(this.text).width
      this.widths.set(this.text, tw)
    }
    const bw = tw + PAD_X * 2
    const p = cam.worldToScreen(this.wx, this.wy)
    const bx = clamp(p.x - bw / 2, MARGIN, Math.max(MARGIN, cam.vw - bw - MARGIN))
    let by = p.y - NOTCH - H - 4
    let dir: 1 | -1 = 1
    if (by < MARGIN) {
      dir = -1
      by = p.y + NOTCH + 4
    }
    const tipX = clamp(p.x, bx + 10, bx + bw - 10)
    const tipY = dir === 1 ? by + H + NOTCH : by - NOTCH
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(tipX, tipY)
    ctx.scale(scale, scale)
    ctx.translate(-tipX, -tipY)
    bubblePath(ctx, bx, by, bw, H, 7, tipX, dir)
    ctx.fillStyle = 'rgba(255,255,255,0.93)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(13,58,92,0.85)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#0d3a5c'
    ctx.fillText(this.text, bx + PAD_X, by + 15)
    ctx.restore()
  }
}

function bubblePath(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  r: number,
  tipX: number,
  dir: 1 | -1
): void {
  ctx.beginPath()
  if (dir === 1) {
    // notch on the bottom edge - bubble floats above the anchor
    ctx.moveTo(bx + r, by)
    ctx.lineTo(bx + bw - r, by)
    ctx.arcTo(bx + bw, by, bx + bw, by + r, r)
    ctx.lineTo(bx + bw, by + bh - r)
    ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r)
    ctx.lineTo(tipX + NOTCH, by + bh)
    ctx.lineTo(tipX, by + bh + NOTCH)
    ctx.lineTo(tipX - NOTCH, by + bh)
    ctx.lineTo(bx + r, by + bh)
    ctx.arcTo(bx, by + bh, bx, by + bh - r, r)
    ctx.lineTo(bx, by + r)
    ctx.arcTo(bx, by, bx + r, by, r)
  } else {
    // notch on the top edge - bubble hangs below the anchor
    ctx.moveTo(bx + r, by)
    ctx.lineTo(tipX - NOTCH, by)
    ctx.lineTo(tipX, by - NOTCH)
    ctx.lineTo(tipX + NOTCH, by)
    ctx.lineTo(bx + bw - r, by)
    ctx.arcTo(bx + bw, by, bx + bw, by + r, r)
    ctx.lineTo(bx + bw, by + bh - r)
    ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r)
    ctx.lineTo(bx + r, by + bh)
    ctx.arcTo(bx, by + bh, bx, by + bh - r, r)
    ctx.lineTo(bx, by + r)
    ctx.arcTo(bx, by, bx + r, by, r)
  }
  ctx.closePath()
}
