# Chaos Viewer themes - pixel art contract

The board mode renders terrain from ONE sprite atlas PNG per theme. Until a PNG
exists, a procedural placeholder painted in the exact same layout is used, so
dropping the real art in requires zero code changes.

## Where the art goes

```
console/src/renderer/src/chaos/themes/meier/atlas.png
```

Save the file, then RESTART `npm run dev` (a newly created file is the one case
Vite's hot reload can miss - it is picked up at startup via import.meta.glob).

## Atlas format (meier)

- One PNG, 8 columns x 4 rows of 32x32 px cells = 256 x 128 px total.
- No padding, no gutters between cells. Cell (col, row) sits at (col*32, row*32).

| Row | Cols 0-3 | Cols 4-7 |
|---|---|---|
| 0 | desert terrain, variants 1-4 | desert decor (cactus, rocks), variants 1-4 |
| 1 | plow terrain, variants 1-4 | plow decor (sprouts; variant 4 = scarecrow), variants 1-4 |
| 2 | corn terrain, variants 1-4 | corn decor (tall stalks), variants 1-4 |
| 3 | cloud sprites, variants 1-4 | reserved (leave transparent) |

Status mapping: unmatched functions = desert, drafts and near-misses = plow,
matched = corn.

## Rules for the tiles

- Terrain cells (cols 0-3, rows 0-2) must be FULLY OPAQUE. They tile edge to
  edge; the engine draws the black function borders, so keep borders out of
  the art.
- Terrain variants of one kind are placed randomly next to each other - they
  must look seamless in any mix (keep edge pixels consistent across the 4
  variants of a row).
- Decor cells (cols 4-7) and cloud cells (row 3) need a TRANSPARENT background.
  Decor is stamped on top of a terrain tile of the same kind (roughly 1 in 11
  cells gets decor).
- Draw at exactly 32x32 with hard pixel edges - no anti-aliasing, no soft
  shadows. The renderer scales with nearest-neighbor (16 to 64 px on screen),
  so crisp pixels stay crisp and AA halos look like dirt.
- Draw tiles as normal SQUARE top-down art. The board renders at an angle by
  squashing everything vertically (about 0.62x) - the renderer handles that;
  do not pre-squash or skew the art.
- Cloud sprites are drawn much larger during the board entry transition -
  chunky silhouettes read better than detailed ones.

## Adding a whole new theme later

1. Create `chaos/themes/<id>/index.ts` exporting a `SpriteTheme` (copy
   meier/index.ts; adjust colors + layout if the atlas differs).
2. Add it to `THEMES` in `chaos/themes/index.ts`.
3. Drop `atlas.png` in the folder. The bottom-left picker lists every
   registered theme automatically.

Flat color-only themes are simpler: export a `FlatTheme` (see classic.ts) -
board mode then renders flat fills with black borders.
