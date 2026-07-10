import type { Camera } from '../camera'
import type { World } from '../../layout'
import type { Rect } from '../../types'
import type { SourceCache } from '../../sourceCache'
import { clamp, smoothstep } from '../anim'
import { CODE_MIN_H, CODE_MIN_W, isDimmed } from './classic'
import type { PaintView } from './classic'

const HEADER_FONT = '600 11px "Segoe UI", system-ui, sans-serif'
const INK = 'rgba(13,42,66,0.92)'
const INK_SOFT = 'rgba(13,42,66,0.55)'
const GREEK_LOADING = 'rgba(90,110,130,0.30)'
const GREEK_NONE = 'rgba(151,124,83,0.32)'
const MAX_LINE_H = 18

/** Estimated line count for functions whose source has not arrived (or never will):
 *  the greek must be deterministic so bakes are stable. */
function greekCount(size: number): number {
  return clamp(Math.round(size / 6), 8, 400)
}

function lineHash(idHash: number, i: number): number {
  let h = (idHash ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  return h >>> 0
}

/** Code fill for tiles that project large enough: real source lines when the
 *  cache has them, deterministic greeked bars otherwise. Screen-space pass
 *  (dpr transform applied) so text renders at exact device sizes. Bake-only. */
export function paintCode(
  ctx: CanvasRenderingContext2D,
  world: World,
  view: Rect,
  v: PaintView,
  cam: Camera,
  sources: SourceCache,
  scratch: number[]
): void {
  const vTop = (view.y - cam.y) * cam.z + cam.vh / 2
  const vBot = (view.y + view.h - cam.y) * cam.z + cam.vh / 2
  for (const i of world.query(view, scratch)) {
    const n = world.fns[i]
    const hpx = n.h * cam.z
    const wpx = n.w * cam.z
    if (hpx < CODE_MIN_H || wpx < CODE_MIN_W) continue
    const fadeA = smoothstep(CODE_MIN_H, 100, hpx)
    if (fadeA < 0.05) continue
    const entry = sources.get(n.f.id)
    if (entry.state === 'idle') sources.request(n.f)
    const p = cam.worldToScreen(n.x, n.y)
    ctx.save()
    ctx.beginPath()
    ctx.rect(p.x + 1, p.y + 1, wpx - 2, hpx - 2)
    ctx.clip()
    const dimA = isDimmed(n.f, v) ? 0.14 : 1
    // readability wash over the status color - ramped over a wide zoom range so
    // settle-to-settle bakes never visibly snap the tile's color
    ctx.globalAlpha = dimA * smoothstep(CODE_MIN_H, 220, hpx)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillRect(p.x + 1, p.y + 1, wpx - 2, hpx - 2)
    ctx.globalAlpha = dimA * fadeA
    ctx.font = HEADER_FONT
    ctx.fillStyle = INK
    ctx.fillText(n.f.name, p.x + 6, p.y + 14, wpx - 12)
    const src = entry.state === 'ready' ? entry.src : undefined
    const padX = Math.max(6, wpx * 0.04)
    const top = p.y + 22
    const availH = hpx - 26
    const nLines = src ? src.lines.length : greekCount(n.f.size)
    const lineH = Math.min(availH / Math.max(1, nLines), MAX_LINE_H)
    const i0 = Math.max(0, Math.floor((vTop - top) / lineH))
    const i1 = Math.min(nLines, Math.ceil((vBot - top) / lineH))
    if (src && lineH >= 7) {
      const fontPx = Math.max(6, Math.floor(lineH * 0.78))
      ctx.font = `${fontPx}px Consolas, "Courier New", monospace`
      ctx.fillStyle = INK
      const maxChars = Math.ceil((wpx - padX * 2) / (fontPx * 0.55))
      for (let li = i0; li < i1; li++) {
        const text = src.lines[li]
        if (!text) continue
        ctx.fillText(text.replace(/\t/g, '  ').slice(0, maxChars), p.x + padX, top + li * lineH + lineH * 0.8)
      }
      if (src.truncated) {
        ctx.fillStyle = INK_SOFT
        ctx.font = `${Math.max(8, fontPx)}px Consolas, "Courier New", monospace`
        ctx.fillText('...', p.x + padX, Math.min(top + nLines * lineH + 12, p.y + hpx - 6))
      }
    } else {
      // greeked ghost lines: loading = neutral gray, no-source = desert-tinted
      const barH = Math.max(1, lineH * 0.55)
      ctx.fillStyle = entry.state === 'none' ? GREEK_NONE : GREEK_LOADING
      for (let li = i0; li < i1; li++) {
        const h = lineHash(n.idHash, li)
        const indent = (h % 4) * (wpx * 0.03)
        const bw = (0.3 + ((h >>> 4) % 56) / 100) * (wpx - padX * 2 - indent)
        if (bw <= 0) continue
        ctx.fillRect(p.x + padX + indent, top + li * lineH + (lineH - barH) / 2, bw, barH)
      }
    }
    ctx.restore()
  }
  ctx.globalAlpha = 1
}
