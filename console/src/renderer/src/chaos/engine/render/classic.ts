import type { AtlasFunction } from '../../../../../shared/types'
import type { World } from '../../layout'
import type { Rect } from '../../types'
import type { Theme } from '../../themes/types'

export interface PaintView {
  theme: Theme
  colorBy: 'status' | 'author'
  authorColors?: Map<string, string>
  authorResolve?: Map<string, string>
  authorFilter: string | null
  moduleFilter: string | null
  showNearMiss: boolean
}

const AUTHOR_FALLBACK = '#9aa7b5'
const LABEL_FONT = '600 11px "Segoe UI", system-ui, sans-serif'

function resolveAuthor(v: PaintView, a?: string): string {
  return a ? v.authorResolve?.get(a) ?? a : ''
}

export function fnColor(f: AtlasFunction, v: PaintView): string {
  const c = v.theme.colors
  if (v.colorBy === 'author') {
    if (!f.matched) return c.unmatched
    const who = resolveAuthor(v, f.author)
    return (who && v.authorColors?.get(who)) || AUTHOR_FALLBACK
  }
  if (f.matched) return c.matched
  if (typeof f.div === 'number' && v.showNearMiss) return c.nearMiss
  return c.unmatched
}

export function isDimmed(f: AtlasFunction, v: PaintView): boolean {
  return (
    (!!v.moduleFilter && f.module !== v.moduleFilter) ||
    (!!v.authorFilter && resolveAuthor(v, f.author) !== v.authorFilter)
  )
}

/** Tiles + module borders/labels, painted in world space. The ctx transform must
 *  already map world units to device px. Visual parity with Treemap.tsx. */
export function paintClassicBase(
  ctx: CanvasRenderingContext2D,
  world: World,
  view: Rect,
  v: PaintView,
  scratch: number[]
): void {
  for (const i of world.query(view, scratch)) {
    const n = world.fns[i]
    ctx.globalAlpha = isDimmed(n.f, v) ? 0.14 : 1
    ctx.fillStyle = fnColor(n.f, v)
    ctx.fillRect(n.x, n.y, Math.max(0.5, n.w - 0.5), Math.max(0.5, n.h - 0.5))
  }
  ctx.globalAlpha = 1

  for (const m of world.mods) {
    const sel = v.moduleFilter === m.module
    ctx.strokeStyle = sel ? v.theme.colors.moduleStroke : 'rgba(13,58,92,0.55)'
    ctx.lineWidth = sel ? 2.5 : 1
    ctx.strokeRect(m.x + 0.5, m.y + 0.5, Math.max(0, m.w - 1), Math.max(0, m.h - 1))
    if (m.w > 30 && m.h > 12) {
      ctx.font = LABEL_FONT
      ctx.lineJoin = 'round'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.strokeText(m.module, m.x + 4, m.y + 12)
      ctx.fillStyle = v.theme.colors.moduleStroke
      ctx.fillText(m.module, m.x + 4, m.y + 12)
    }
  }
}
