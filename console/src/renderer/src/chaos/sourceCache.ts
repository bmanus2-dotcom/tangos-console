import type { AtlasFunction, AtlasSource } from '../../../shared/types'

export type SourceState = 'idle' | 'loading' | 'ready' | 'none'

export interface SourceEntry {
  state: SourceState
  src?: AtlasSource
}

const CAP = 64
const IDLE: SourceEntry = { state: 'idle' }

/** LRU over the atlas:source IPC. Greeked ghost lines render while 'loading';
 *  'none' means no source exists (unmatched with no disasm) - greek forever. */
export class SourceCache {
  private readonly map = new Map<string, SourceEntry>()
  /** Fired when a request settles - the engine rebakes so real lines swap in. */
  onReady: ((fnId: string) => void) | null = null

  get(id: string): SourceEntry {
    const e = this.map.get(id)
    if (!e) return IDLE
    this.map.delete(id)
    this.map.set(id, e)
    return e
  }

  request(f: AtlasFunction): void {
    const cur = this.map.get(f.id)
    if (cur && cur.state !== 'idle') return
    const entry: SourceEntry = { state: 'loading' }
    this.map.set(f.id, entry)
    this.evict()
    window.tangos
      .atlasSource({ id: f.id, srcPath: f.srcPath })
      .then((src) => {
        if (this.map.get(f.id) !== entry) return
        if (src && src.lines.length) {
          entry.state = 'ready'
          entry.src = src
        } else {
          entry.state = 'none'
        }
        this.onReady?.(f.id)
      })
      .catch(() => {
        if (this.map.get(f.id) === entry) entry.state = 'none'
        this.onReady?.(f.id)
      })
  }

  clear(): void {
    this.map.clear()
  }

  private evict(): void {
    while (this.map.size > CAP) {
      const k = this.map.keys().next().value
      if (k == null) break
      this.map.delete(k)
    }
  }
}
