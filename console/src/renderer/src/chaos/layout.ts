import { squarify } from '../atlas/squarify'
import type { AtlasDb, AtlasFunction } from '../../../shared/types'
import type { Rect } from './types'

export interface FnNode {
  f: AtlasFunction
  x: number
  y: number
  w: number
  h: number
  modIx: number
  /** FNV-1a of f.id - stable seed for board tile variants. */
  idHash: number
}

export interface ModNode {
  module: string
  x: number
  y: number
  w: number
  h: number
}

export interface World {
  w: number
  h: number
  mods: ModNode[]
  fns: FnNode[]
  byId: Map<string, number>
  medianFnArea: number
  medianModArea: number
  /** Fills `out` with indexes of functions intersecting r. Returns out. */
  query: (r: Rect, out: number[]) => number[]
  hitFn: (wx: number, wy: number) => FnNode | null
  hitMod: (wx: number, wy: number) => ModNode | null
}

const GRID_CELL = 32

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function median(sorted: number[]): number {
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 1
}

/** Same nesting as the classic Treemap (Treemap.tsx geometry): modules squarified
 *  into the full rect, then each module's functions squarified inside a 1px inset.
 *  Adds a uniform grid so culling and hover hit tests stay cheap at 10k tiles. */
export function buildWorld(db: AtlasDb, w: number, h: number): World {
  const groups = new Map<string, { module: string; value: number; funcs: AtlasFunction[] }>()
  for (const f of db.functions) {
    const g = groups.get(f.module) ?? { module: f.module, value: 0, funcs: [] }
    g.value += Math.max(1, f.size)
    g.funcs.push(f)
    groups.set(f.module, g)
  }
  const modItems = [...groups.values()].sort((a, b) => b.value - a.value)
  const modTiles = squarify(modItems, 0, 0, w, h)
  const mods: ModNode[] = []
  const fns: FnNode[] = []
  for (const mt of modTiles) {
    const modIx = mods.length
    const items = mt.item.funcs
      .slice()
      .sort((a, b) => b.size - a.size)
      .map((f) => ({ f, value: Math.max(1, f.size) }))
    const fnTiles = squarify(items, mt.x + 1, mt.y + 1, Math.max(0, mt.w - 2), Math.max(0, mt.h - 2))
    for (const ft of fnTiles) {
      fns.push({ f: ft.item.f, x: ft.x, y: ft.y, w: ft.w, h: ft.h, modIx, idHash: fnv1a(ft.item.f.id) })
    }
    mods.push({ module: mt.item.module, x: mt.x, y: mt.y, w: mt.w, h: mt.h })
  }

  const byId = new Map<string, number>()
  for (let i = 0; i < fns.length; i++) byId.set(fns[i].f.id, i)

  const cols = Math.max(1, Math.ceil(w / GRID_CELL))
  const rows = Math.max(1, Math.ceil(h / GRID_CELL))
  const cells: number[][] = Array.from({ length: cols * rows }, () => [])
  const cellX = (v: number): number => Math.min(cols - 1, Math.max(0, Math.floor(v / GRID_CELL)))
  const cellY = (v: number): number => Math.min(rows - 1, Math.max(0, Math.floor(v / GRID_CELL)))
  for (let i = 0; i < fns.length; i++) {
    const n = fns[i]
    const x1 = cellX(n.x + n.w)
    const y1 = cellY(n.y + n.h)
    for (let cy = cellY(n.y); cy <= y1; cy++) {
      for (let cx = cellX(n.x); cx <= x1; cx++) cells[cy * cols + cx].push(i)
    }
  }

  const stamp = new Int32Array(fns.length)
  let gen = 0

  function query(r: Rect, out: number[]): number[] {
    out.length = 0
    gen++
    const x1 = cellX(r.x + r.w)
    const y1 = cellY(r.y + r.h)
    for (let cy = cellY(r.y); cy <= y1; cy++) {
      for (let cx = cellX(r.x); cx <= x1; cx++) {
        for (const i of cells[cy * cols + cx]) {
          if (stamp[i] === gen) continue
          stamp[i] = gen
          const n = fns[i]
          if (n.x < r.x + r.w && n.x + n.w > r.x && n.y < r.y + r.h && n.y + n.h > r.y) out.push(i)
        }
      }
    }
    return out
  }

  function hitFn(wx: number, wy: number): FnNode | null {
    if (wx < 0 || wy < 0 || wx > w || wy > h) return null
    for (const i of cells[cellY(wy) * cols + cellX(wx)]) {
      const n = fns[i]
      if (wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h) return n
    }
    return null
  }

  function hitMod(wx: number, wy: number): ModNode | null {
    for (const m of mods) {
      if (wx >= m.x && wx <= m.x + m.w && wy >= m.y && wy <= m.y + m.h) return m
    }
    return null
  }

  const fnAreas = fns.map((n) => n.w * n.h).sort((a, b) => a - b)
  const modAreas = mods.map((m) => m.w * m.h).sort((a, b) => a - b)

  return {
    w,
    h,
    mods,
    fns,
    byId,
    medianFnArea: median(fnAreas),
    medianModArea: median(modAreas),
    query,
    hitFn,
    hitMod
  }
}
