/** One atlas cell edge in px - the canvas size Brennen draws each tile at. */
export const TILE_PX = 32

export type ThemeMode = 'flat' | 'sprite'

export interface ThemeColors {
  matched: string
  nearMiss: string
  unmatched: string
  /** srcPath present but neither matched nor a recorded divergence. */
  draft: string
  moduleStroke: string
  selection: string
  background: string
  /** Painted under the tiles across the world bounds so the gaps between tiles
   *  show a stable, world-locked tone instead of the screen-fixed panel glass. */
  ground: string
}

interface ThemeBase {
  id: string
  name: string
  mode: ThemeMode
  /** Sprite themes need flat colors too: far-zoom LOD1, legend swatches, load fallback. */
  colors: ThemeColors
}

export interface FlatTheme extends ThemeBase {
  mode: 'flat'
}

/** A run of tile variants: starts at (col,row), variants extend rightward. */
export interface TileRange {
  col: number
  row: number
  variants: number
}

export interface TileAtlasLayout {
  cols: number
  rows: number
  terrain: {
    desert: TileRange
    plow: TileRange
    corn: TileRange
  }
  decor?: {
    desert?: TileRange
    plow?: TileRange
    corn?: TileRange
  }
  clouds?: TileRange
}

export interface SpriteTheme extends ThemeBase {
  mode: 'sprite'
  tilePx: number
  layout: TileAtlasLayout
  resolveAtlas: () => Promise<CanvasImageSource>
}

export type Theme = FlatTheme | SpriteTheme
