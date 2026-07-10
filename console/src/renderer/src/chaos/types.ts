export interface Pt {
  x: number
  y: number
}

/** How the treemap is grouped: ov sections (default), one flat map by size,
 *  three status bands (uncleared -> draft -> matched), or contributor sections. */
export type LayoutMode = 'ov' | 'size' | 'match' | 'contributor'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
