import { mulberry32 } from '../../engine/anim'
import type { TileAtlasLayout, TileRange } from '../types'

/** Procedural stand-in tiles painted into the SAME atlas layout the hand-drawn
 *  PNG will use - the board renderer cannot tell them apart. No binary files
 *  in the repo; regenerated once per theme activation, deterministic seed. */
export function generatePlaceholderAtlas(tilePx: number, layout: TileAtlasLayout): HTMLCanvasElement {
  const cvs = document.createElement('canvas')
  cvs.width = layout.cols * tilePx
  cvs.height = layout.rows * tilePx
  const c = cvs.getContext('2d')
  if (!c) return cvs
  c.imageSmoothingEnabled = false
  const rnd = mulberry32(0x7a2c05)

  const px = (cx: number, cy: number, x: number, y: number, w: number, h: number, color: string): void => {
    c.fillStyle = color
    c.fillRect(cx * tilePx + Math.round(x), cy * tilePx + Math.round(y), Math.round(w), Math.round(h))
  }

  const eachVariant = (r: TileRange | undefined, paint: (cx: number, cy: number, vi: number) => void): void => {
    if (!r) return
    for (let vi = 0; vi < r.variants; vi++) paint(r.col + vi, r.row, vi)
  }

  // desert - sand with speckles and a wavy dune ridge
  eachVariant(layout.terrain.desert, (cx, cy) => {
    px(cx, cy, 0, 0, tilePx, tilePx, '#cfa969')
    for (let i = 0; i < 30; i++) {
      px(cx, cy, rnd() * tilePx, rnd() * tilePx, 2, 1, rnd() < 0.5 ? '#b89051' : '#e2c58a')
    }
    const ry = 6 + Math.floor(rnd() * (tilePx - 12))
    const ph = rnd() * 6
    for (let x = 0; x < tilePx; x += 2) {
      px(cx, cy, x, ry + Math.sin(x / 5 + ph) * 2, 2, 1, '#b89051')
    }
  })

  // plow - turned yellow field with horizontal furrows
  eachVariant(layout.terrain.plow, (cx, cy) => {
    px(cx, cy, 0, 0, tilePx, tilePx, '#d9b23f')
    for (let y = 2; y < tilePx; y += 5) {
      px(cx, cy, 0, y, tilePx, 2, '#b08a25')
      for (let i = 0; i < 4; i++) {
        px(cx, cy, rnd() * tilePx, y - 1 + rnd() * 3, 1, 1, '#8a6a1c')
      }
    }
  })

  // corn - green field with stalk rows and yellow tips
  eachVariant(layout.terrain.corn, (cx, cy) => {
    px(cx, cy, 0, 0, tilePx, tilePx, '#3fa04a')
    for (let i = 0; i < 12; i++) {
      px(cx, cy, rnd() * tilePx, rnd() * tilePx, 1, 1, '#358a40')
    }
    for (let y = 3; y < tilePx - 2; y += 6) {
      for (let x = 2 + (y % 4); x < tilePx - 1; x += 5) {
        px(cx, cy, x, y, 1, 3, '#2c7a36')
        px(cx, cy, x, y - 1, 1, 1, '#e8d44d')
      }
    }
  })

  // desert decor - cactus / rocks, transparent background
  eachVariant(layout.decor?.desert, (cx, cy, vi) => {
    const s = tilePx / 32
    if (vi % 2 === 0) {
      px(cx, cy, 14 * s, 8 * s, 4 * s, 18 * s, '#2e7d4f')
      px(cx, cy, 8 * s, 12 * s, 6 * s, 3 * s, '#2e7d4f')
      px(cx, cy, 8 * s, 8 * s, 3 * s, 7 * s, '#2e7d4f')
      px(cx, cy, 20 * s, 15 * s, 6 * s, 3 * s, '#2e7d4f')
      px(cx, cy, 23 * s, 11 * s, 3 * s, 7 * s, '#2e7d4f')
      px(cx, cy, 15 * s, 9 * s, 1 * s, 16 * s, '#3f9e66')
    } else {
      px(cx, cy, 6 * s, 20 * s, 10 * s, 6 * s, '#9b9484')
      px(cx, cy, 17 * s, 22 * s, 8 * s, 5 * s, '#857f70')
      px(cx, cy, 8 * s, 18 * s, 5 * s, 3 * s, '#b0a996')
    }
  })

  // plow decor - sprouts, one scarecrow variant
  eachVariant(layout.decor?.plow, (cx, cy, vi) => {
    const s = tilePx / 32
    if (vi === 3) {
      px(cx, cy, 15 * s, 10 * s, 3 * s, 16 * s, '#7a5230')
      px(cx, cy, 8 * s, 14 * s, 17 * s, 2 * s, '#7a5230')
      px(cx, cy, 13 * s, 5 * s, 7 * s, 6 * s, '#d9b23f')
      px(cx, cy, 12 * s, 4 * s, 9 * s, 2 * s, '#8a6a1c')
    } else {
      for (let i = 0; i < 5; i++) {
        const sx = 3 + rnd() * (tilePx - 8)
        const sy = 4 + rnd() * (tilePx - 10)
        px(cx, cy, sx, sy, 1, 3, '#2c7a36')
        px(cx, cy, sx + 2, sy, 1, 3, '#2c7a36')
        px(cx, cy, sx + 1, sy + 2, 1, 2, '#2c7a36')
      }
    }
  })

  // corn decor - taller stalk clusters
  eachVariant(layout.decor?.corn, (cx, cy) => {
    const s = tilePx / 32
    for (let i = 0; i < 3; i++) {
      const x = (6 + i * 9 + rnd() * 3) * s
      const top = (5 + rnd() * 4) * s
      px(cx, cy, x, top, 2 * s, 20 * s, '#2c7a36')
      px(cx, cy, x - 2 * s, top + 6 * s, 2 * s, 2 * s, '#2c7a36')
      px(cx, cy, x + 2 * s, top + 10 * s, 2 * s, 2 * s, '#2c7a36')
      px(cx, cy, x, top - 3 * s, 2 * s, 3 * s, '#e8d44d')
    }
  })

  // clouds - chunky white puffs, transparent background
  eachVariant(layout.clouds, (cx, cy) => {
    const rows = 6
    for (let r = 0; r < rows; r++) {
      const k = Math.sin((Math.PI * (r + 0.5)) / rows)
      const w = Math.round((tilePx * 0.55 + rnd() * tilePx * 0.3) * k + tilePx * 0.2)
      const x = Math.round((tilePx - w) / 2 + (rnd() - 0.5) * 6)
      const y = Math.round(tilePx * 0.15 + r * (tilePx * 0.12))
      px(cx, cy, x, y, w, tilePx * 0.13, r >= rows - 2 ? '#d6e2ee' : '#ffffff')
    }
  })

  return cvs
}
