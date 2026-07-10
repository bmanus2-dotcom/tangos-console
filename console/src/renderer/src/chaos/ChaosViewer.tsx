import { useEffect, useRef, useState } from 'react'
import type { AtlasDb, AtlasFunction } from '../../../shared/types'
import { ChaosEngine } from './engine/engine'
import { InputController } from './engine/input'
import { THEMES } from './themes'

/** The redesigned Chaos Viewer. Drop-in for the classic Treemap in AtlasView:
 *  same data/callback contract, rendering handled by the chaos engine. Overlay
 *  chrome: theme picker + contributor toggle bottom-left, the board "?" button
 *  bottom-right while at the states zoom (band 2). */
export default function ChaosViewer({
  db,
  moduleFilter,
  onModule,
  onFunction,
  selectedId,
  colorBy = 'status',
  onColorBy,
  authorColors,
  authorResolve,
  authorFilter = null,
  showNearMiss = true,
  theme = 'classic',
  onTheme
}: {
  db: AtlasDb
  moduleFilter: string | null
  onModule: (m: string | null) => void
  onFunction: (f: AtlasFunction) => void
  selectedId?: string
  colorBy?: 'status' | 'author'
  onColorBy?: (c: 'status' | 'author') => void
  authorColors?: Map<string, string>
  authorResolve?: Map<string, string>
  authorFilter?: string | null
  showNearMiss?: boolean
  theme?: string
  onTheme?: (id: string) => void
}): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<ChaosEngine | null>(null)
  const cbRef = useRef({ onModule, onFunction })
  cbRef.current = { onModule, onFunction }
  const [band, setBand] = useState<1 | 2 | 3>(1)
  const [board, setBoard] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const el = wrapRef.current
    if (!canvas || !el) return
    const engine = new ChaosEngine(canvas, {
      onModule: (m) => cbRef.current.onModule(m),
      onFunction: (f) => cbRef.current.onFunction(f),
      onBand: setBand,
      onBoard: setBoard
    })
    engineRef.current = engine
    const input = new InputController(canvas, engine)
    input.attach()
    let t: ReturnType<typeof setTimeout> | null = null
    const apply = (): void => {
      engine.resize(
        Math.max(240, el.clientWidth - 16),
        Math.max(120, el.clientHeight - 16),
        window.devicePixelRatio || 1
      )
    }
    apply()
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t)
      t = setTimeout(apply, 150)
    })
    ro.observe(el)
    return () => {
      if (t) clearTimeout(t)
      ro.disconnect()
      input.detach()
      engine.destroy()
      engineRef.current = null
      setBand(1)
      setBoard(false)
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setData(db)
  }, [db])

  useEffect(() => {
    engineRef.current?.setOptions({
      colorBy,
      authorColors,
      authorResolve,
      authorFilter,
      moduleFilter,
      showNearMiss,
      selectedId,
      themeId: theme
    })
  }, [colorBy, authorColors, authorResolve, authorFilter, moduleFilter, showNearMiss, selectedId, theme])

  const refocus = (): void => canvasRef.current?.focus()

  return (
    <div className="atlas-treemap aero-panel fill" ref={wrapRef} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{ display: 'block', cursor: 'pointer', borderRadius: 8, outline: 'none', touchAction: 'none' }}
      />
      <div className="chaos-overlay bl">
        {onTheme && (
          <div className="seg">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={theme === t.id ? 'on' : ''}
                title={`theme: ${t.name}`}
                onClick={() => {
                  onTheme(t.id)
                  refocus()
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
        {theme === 'classic' && onColorBy && (
          <div className="seg">
            <button
              className={colorBy === 'status' ? 'on' : ''}
              onClick={() => {
                onColorBy('status')
                refocus()
              }}
            >
              Status
            </button>
            <button
              className={colorBy === 'author' ? 'on' : ''}
              onClick={() => {
                onColorBy('author')
                refocus()
              }}
            >
              Contributor
            </button>
          </div>
        )}
      </div>
      {(band === 2 || board) && (
        <div className="chaos-overlay br">
          <button
            className="chaos-board-btn"
            title={board ? 'leave the board (Esc)' : 'enter the board'}
            onClick={() => {
              if (board) engineRef.current?.exitBoard()
              else engineRef.current?.enterBoard()
              refocus()
            }}
          >
            ?
          </button>
        </div>
      )}
    </div>
  )
}
