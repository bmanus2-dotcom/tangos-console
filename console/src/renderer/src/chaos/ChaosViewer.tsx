import { useEffect, useRef } from 'react'
import type { AtlasDb, AtlasFunction } from '../../../shared/types'
import { ChaosEngine } from './engine/engine'

/** The redesigned Chaos Viewer. Drop-in for the classic Treemap in AtlasView:
 *  same data/callback contract, rendering handled by the chaos engine. */
export default function ChaosViewer({
  db,
  moduleFilter,
  onModule,
  onFunction,
  selectedId,
  colorBy = 'status',
  authorColors,
  authorResolve,
  authorFilter = null,
  showNearMiss = true,
  theme = 'classic'
}: {
  db: AtlasDb
  moduleFilter: string | null
  onModule: (m: string | null) => void
  onFunction: (f: AtlasFunction) => void
  selectedId?: string
  colorBy?: 'status' | 'author'
  authorColors?: Map<string, string>
  authorResolve?: Map<string, string>
  authorFilter?: string | null
  showNearMiss?: boolean
  theme?: string
}): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<ChaosEngine | null>(null)
  const cbRef = useRef({ onModule, onFunction })
  cbRef.current = { onModule, onFunction }

  useEffect(() => {
    const canvas = canvasRef.current
    const el = wrapRef.current
    if (!canvas || !el) return
    const engine = new ChaosEngine(canvas, {
      onModule: (m) => cbRef.current.onModule(m),
      onFunction: (f) => cbRef.current.onFunction(f)
    })
    engineRef.current = engine
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
      engine.destroy()
      engineRef.current = null
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

  function onClick(e: React.MouseEvent): void {
    const cvs = canvasRef.current
    if (!cvs) return
    const r = cvs.getBoundingClientRect()
    engineRef.current?.click(e.clientX - r.left, e.clientY - r.top)
  }

  return (
    <div className="atlas-treemap aero-panel fill" ref={wrapRef} style={{ position: 'relative' }}>
      <canvas ref={canvasRef} onClick={onClick} style={{ display: 'block', cursor: 'pointer', borderRadius: 8 }} />
    </div>
  )
}
