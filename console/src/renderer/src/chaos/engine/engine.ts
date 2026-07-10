import type { AtlasDb, AtlasFunction } from '../../../../shared/types'
import { buildWorld } from '../layout'
import type { World } from '../layout'
import { getTheme } from '../themes'
import { Camera } from './camera'
import { paintClassicBase } from './render/classic'
import type { PaintView } from './render/classic'

export interface EngineCallbacks {
  onModule: (m: string | null) => void
  onFunction: (f: AtlasFunction) => void
}

export interface ViewOptions {
  colorBy: 'status' | 'author'
  authorColors?: Map<string, string>
  authorResolve?: Map<string, string>
  authorFilter: string | null
  moduleFilter: string | null
  showNearMiss: boolean
  selectedId?: string
  themeId: string
}

declare global {
  interface Window {
    /** Set window.chaosPerf = true from devtools to overlay frame/bake timings. */
    chaosPerf?: boolean
  }
}

const DEFAULT_OPTS: ViewOptions = {
  colorBy: 'status',
  authorFilter: null,
  moduleFilter: null,
  showNearMiss: true,
  themeId: 'classic'
}

/** Owns the rAF loop and all mutable viewer state. React never sees a frame.
 *  Rendering is two layers: a baked base bitmap (tiles, borders, labels) redrawn
 *  only when data/options/camera change, and a dynamic pass (selection, later
 *  ripples/bubbles) drawn over the blit. The loop sleeps whenever nothing moves. */
export class ChaosEngine {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly base: HTMLCanvasElement
  private readonly baseCtx: CanvasRenderingContext2D
  private readonly cb: EngineCallbacks
  private readonly cam = new Camera()
  private readonly scratch: number[] = []
  private db: AtlasDb | null = null
  private world: World | null = null
  private opts: ViewOptions = { ...DEFAULT_OPTS }
  private cssW = 0
  private cssH = 0
  private dpr = 1
  private needBake = true
  private rafId: number | null = null
  private disposed = false
  private lastBakeMs = 0
  private lastFrameMs = 0

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas
    this.cb = cb
    const ctx = canvas.getContext('2d')
    const base = document.createElement('canvas')
    const baseCtx = base.getContext('2d')
    if (!ctx || !baseCtx) throw new Error('chaos: 2d canvas context unavailable')
    this.ctx = ctx
    this.base = base
    this.baseCtx = baseCtx
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    if (cssW === this.cssW && cssH === this.cssH && dpr === this.dpr) return
    this.cssW = cssW
    this.cssH = cssH
    this.dpr = dpr
    this.canvas.width = Math.round(cssW * dpr)
    this.canvas.height = Math.round(cssH * dpr)
    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
    this.base.width = this.canvas.width
    this.base.height = this.canvas.height
    this.cam.setViewport(cssW, cssH)
    this.rebuild()
  }

  setData(db: AtlasDb): void {
    this.db = db
    this.rebuild()
  }

  setOptions(next: Partial<ViewOptions>): void {
    const prev = this.opts
    this.opts = { ...prev, ...next }
    const bakeKeys: (keyof ViewOptions)[] = [
      'colorBy',
      'authorColors',
      'authorResolve',
      'authorFilter',
      'moduleFilter',
      'showNearMiss',
      'themeId'
    ]
    if (bakeKeys.some((k) => prev[k] !== this.opts[k])) this.needBake = true
    this.invalidate()
  }

  /** Click in canvas CSS coordinates. Function hit wins; otherwise module toggle -
   *  same semantics as the classic Treemap. */
  click(cssX: number, cssY: number): void {
    if (!this.world) return
    const p = this.cam.screenToWorld(cssX, cssY)
    const fn = this.world.hitFn(p.x, p.y)
    if (fn) {
      this.cb.onFunction(fn.f)
      return
    }
    const mod = this.world.hitMod(p.x, p.y)
    if (mod) this.cb.onModule(this.opts.moduleFilter === mod.module ? null : mod.module)
  }

  invalidate(): void {
    this.wake()
  }

  destroy(): void {
    this.disposed = true
    if (this.rafId != null) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private wake(): void {
    if (this.disposed || this.rafId != null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.frame()
    })
  }

  private rebuild(): void {
    if (!this.db || this.cssW <= 0 || this.cssH <= 0) return
    this.world = buildWorld(this.db, this.cssW, this.cssH)
    this.cam.fitWorld(this.world.w, this.world.h)
    this.needBake = true
    this.invalidate()
  }

  private paintView(): PaintView {
    return {
      theme: getTheme(this.opts.themeId),
      colorBy: this.opts.colorBy,
      authorColors: this.opts.authorColors,
      authorResolve: this.opts.authorResolve,
      authorFilter: this.opts.authorFilter,
      moduleFilter: this.opts.moduleFilter,
      showNearMiss: this.opts.showNearMiss
    }
  }

  private bake(): void {
    if (!this.world) return
    const t0 = performance.now()
    const c = this.baseCtx
    const { cam, dpr } = this
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, this.base.width, this.base.height)
    c.setTransform(
      dpr * cam.z,
      0,
      0,
      dpr * cam.z,
      dpr * (cam.vw / 2 - cam.x * cam.z),
      dpr * (cam.vh / 2 - cam.y * cam.z)
    )
    paintClassicBase(c, this.world, cam.viewRect(), this.paintView(), this.scratch)
    this.needBake = false
    this.lastBakeMs = performance.now() - t0
  }

  private frame(): void {
    if (this.disposed) return
    const t0 = performance.now()
    if (this.needBake) this.bake()
    const { ctx, canvas } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(this.base, 0, 0)
    this.drawSelection()
    this.lastFrameMs = performance.now() - t0
    if (window.chaosPerf) this.drawPerf()
    // nothing animates yet - the loop sleeps until the next invalidate
  }

  private drawSelection(): void {
    const { world } = this
    const id = this.opts.selectedId
    if (!world || !id) return
    const ix = world.byId.get(id)
    if (ix == null) return
    const n = world.fns[ix]
    const { ctx, cam } = this
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const p = cam.worldToScreen(n.x, n.y)
    const mw = Math.max(n.w * cam.z, 5)
    const mh = Math.max(n.h * cam.z, 5)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = 4
    ctx.strokeRect(p.x - 1, p.y - 1, mw + 2, mh + 2)
    ctx.strokeStyle = getTheme(this.opts.themeId).colors.selection
    ctx.lineWidth = 2
    ctx.strokeRect(p.x - 1, p.y - 1, mw + 2, mh + 2)
  }

  private drawPerf(): void {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.font = '10px Consolas, monospace'
    const text = `bake ${this.lastBakeMs.toFixed(1)}ms frame ${this.lastFrameMs.toFixed(1)}ms`
    const wpx = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(this.cssW - wpx - 12, this.cssH - 18, wpx + 8, 14)
    ctx.fillStyle = '#fff'
    ctx.fillText(text, this.cssW - wpx - 8, this.cssH - 8)
  }
}
