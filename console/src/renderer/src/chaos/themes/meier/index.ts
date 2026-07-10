import type { SpriteTheme, TileAtlasLayout } from '../types'
import { TILE_PX } from '../types'
import { generatePlaceholderAtlas } from './placeholder'

/** The canonical atlas layout - THEMES.md documents this as the art contract. */
const LAYOUT: TileAtlasLayout = {
  cols: 8,
  rows: 4,
  terrain: {
    desert: { col: 0, row: 0, variants: 4 },
    plow: { col: 0, row: 1, variants: 4 },
    corn: { col: 0, row: 2, variants: 4 }
  },
  decor: {
    desert: { col: 4, row: 0, variants: 4 },
    plow: { col: 4, row: 1, variants: 4 },
    corn: { col: 4, row: 2, variants: 4 }
  },
  clouds: { col: 0, row: 3, variants: 4 }
}

// Vite: import.meta.glob returns {} while no file matches, so this is safe until
// the hand-drawn atlas.png lands in this folder (drop it in + restart npm run dev).
const art = import.meta.glob('./atlas.png', { eager: true, import: 'default' }) as Record<string, string>

function loadImage(url: string): Promise<CanvasImageSource> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = url
  })
}

export const meier: SpriteTheme = {
  id: 'meier',
  name: 'Meier',
  mode: 'sprite',
  colors: {
    matched: '#3fa04a',
    nearMiss: '#d9b23f',
    unmatched: '#cfa969',
    draft: '#d9b23f',
    moduleStroke: '#141414',
    selection: '#0d3a5c',
    background: 'transparent',
    ground: 'rgba(31,26,18,0.30)'
  },
  tilePx: TILE_PX,
  layout: LAYOUT,
  resolveAtlas: async () => {
    const url = art['./atlas.png']
    if (url) return await loadImage(url)
    return generatePlaceholderAtlas(TILE_PX, LAYOUT)
  }
}
