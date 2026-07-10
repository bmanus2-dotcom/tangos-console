import type { AtlasFunction } from '../../../../../shared/types'
import type { Camera } from '../camera'
import type { World } from '../../layout'
import type { Rect } from '../../types'
import type { TileAtlasLayout } from '../../themes/types'
import { isDimmed } from './classic'
import type { PaintView } from './classic'

export interface BoardPaint {
  /** null while the theme's atlas is resolving (or the theme is flat) - falls back to flat fills. */
  atlas: CanvasImageSource | null
  tilePx: number
  layout: TileAtlasLayout | null
  /** Edge of one terrain cell in world units - fixed per layout so fields line up across functions. */
  cellWorld: number
}

export function terrainKind(f: AtlasFunction, v: PaintView): 'desert' | 'plow' | 'corn' {
  if (f.matched) return 'corn'
  if ((typeof f.div === 'number' && v.showNearMiss) || f.srcPath) return 'plow'
  return 'desert'
}

/** Civ-style board: a world-aligned grid of terrain tiles clipped per function,
 *  heavy black borders between functions and heavier ones between modules.
 *  Painted in DEVICE space with rounded cell edges so tiles butt perfectly -
 *  no AA seams - and imageSmoothingEnabled=false for crisp pixels. Bake-only. */
export function paintBoard(
  c: CanvasRenderingContext2D,
  world: World,
  view: Rect,
  v: PaintView,
  cam: Camera,
  dpr: number,
  ovX: number,
  ovY: number,
  bp: BoardPaint,
  scratch: number[]
): void {
  c.save()
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.imageSmoothingEnabled = false
  const t = bp.tilePx
  const cw = bp.cellWorld
  const projX = (wx: number): number => Math.round(((wx - cam.x) * cam.z + cam.vw / 2 + ovX) * dpr)
  const projY = (wy: number): number => Math.round(((wy - cam.y) * cam.z * cam.sy + cam.vh / 2 + ovY) * dpr)
  const idx = world.query(view, scratch).slice()
  const colors = v.theme.colors
  // world-locked ground under the board so module insets never show the panel glass
  c.fillStyle = colors.ground
  c.fillRect(projX(0), projY(0), projX(world.w) - projX(0), projY(world.h) - projY(0))
  for (const i of idx) {
    const n = world.fns[i]
    const x0 = projX(n.x)
    const y0 = projY(n.y)
    const x1 = projX(n.x + n.w)
    const y1 = projY(n.y + n.h)
    if (x1 <= x0 || y1 <= y0) continue
    const kind = terrainKind(n.f, v)
    c.save()
    c.beginPath()
    c.rect(x0, y0, x1 - x0, y1 - y0)
    c.clip()
    c.globalAlpha = isDimmed(n.f, v) ? 0.3 : 1
    if (bp.atlas && bp.layout) {
      const range = bp.layout.terrain[kind]
      const decor = bp.layout.decor?.[kind]
      const gx0 = Math.floor(Math.max(n.x, view.x) / cw)
      const gx1 = Math.floor(Math.min(n.x + n.w, view.x + view.w) / cw)
      const gy0 = Math.floor(Math.max(n.y, view.y) / cw)
      const gy1 = Math.floor(Math.min(n.y + n.h, view.y + view.h) / cw)
      for (let gy = gy0; gy <= gy1; gy++) {
        const dy = projY(gy * cw)
        const dh = projY((gy + 1) * cw) - dy
        if (dh <= 0) continue
        for (let gx = gx0; gx <= gx1; gx++) {
          const dx = projX(gx * cw)
          const dw = projX((gx + 1) * cw) - dx
          if (dw <= 0) continue
          const h = (Math.imul(gx, 0x9e3779b1) ^ Math.imul(gy, 0x85ebca77) ^ n.idHash) >>> 0
          c.drawImage(bp.atlas, (range.col + (h % range.variants)) * t, range.row * t, t, t, dx, dy, dw, dh)
          if (decor && (h >>> 8) % 11 === 0) {
            c.drawImage(
              bp.atlas,
              (decor.col + ((h >>> 12) % decor.variants)) * t,
              decor.row * t,
              t,
              t,
              dx,
              dy,
              dw,
              dh
            )
          }
        }
      }
    } else {
      c.fillStyle = kind === 'corn' ? colors.matched : kind === 'plow' ? colors.nearMiss : colors.unmatched
      c.fillRect(x0, y0, x1 - x0, y1 - y0)
    }
    c.restore()
  }
  c.globalAlpha = 1
  // slab front faces on module bottom edges - the tilted-board depth cue - plus
  // a thin light bevel on top edges, then the black border passes
  const face = Math.min(16 * dpr, Math.max(5 * dpr, Math.round(0.3 * cw * cam.z * dpr)))
  for (const m of world.mods) {
    if (m.x > view.x + view.w || m.x + m.w < view.x || m.y > view.y + view.h || m.y + m.h < view.y) continue
    const mx0 = projX(m.x)
    const mx1 = projX(m.x + m.w)
    c.fillStyle = 'rgba(22,18,12,0.88)'
    c.fillRect(mx0, projY(m.y + m.h), mx1 - mx0, face)
    c.fillStyle = 'rgba(255,255,255,0.16)'
    c.fillRect(mx0, projY(m.y), mx1 - mx0, Math.max(1, Math.round(1.5 * dpr)))
  }
  const bw = Math.max(2, Math.round(0.06 * cw * cam.z * dpr))
  c.strokeStyle = '#141414'
  c.lineWidth = bw
  for (const i of idx) {
    const n = world.fns[i]
    c.strokeRect(projX(n.x), projY(n.y), projX(n.x + n.w) - projX(n.x), projY(n.y + n.h) - projY(n.y))
  }
  c.lineWidth = Math.max(3, Math.round(bw * 1.8))
  for (const m of world.mods) {
    if (m.x > view.x + view.w || m.x + m.w < view.x || m.y > view.y + view.h || m.y + m.h < view.y) continue
    c.strokeRect(projX(m.x), projY(m.y), projX(m.x + m.w) - projX(m.x), projY(m.y + m.h) - projY(m.y))
  }
  c.restore()
}
