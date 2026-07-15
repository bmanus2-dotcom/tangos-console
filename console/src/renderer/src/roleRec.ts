import type { AiAgent } from '../../shared/types'

export interface RoleRec {
  role: string | null // null = not enough evidence to recommend a role yet
  why: string
}

/** Recommend a role for an AI ONLY from its measured strengths - no guessing a model's
 *  strengths before it has a track record here. Returns role=null until there's data. */
export function recommendRole(a: AiAgent): RoleRec {
  const s = a.stats
  const by = s.bySize
  const rate = (t?: { attempts: number; matches: number }): number | null =>
    t && t.attempts >= 2 ? t.matches / t.attempts : null

  // Need a real sample before claiming anything.
  if (by && s.matchAttempts >= 4) {
    const rBig = rate(by['>0x800'])
    const rSmall = rate(by['<=0x40'])
    if (rBig != null && rBig >= 0.4) return { role: 'Hard matcher', why: 'lands large functions others skip' }
    if (rSmall != null && rSmall >= 0.6) return { role: 'Refiner', why: 'high hit rate - good at closing functions out' }
    if (s.hitRate < 0.25) return { role: 'Drafter', why: 'gets functions close; let the Refiner finish them' }
    if (s.hitRate >= 0.5) return { role: 'Refiner', why: 'steady, reliable at landing matches' }
  }
  return { role: null, why: 'still learning - assign it work to find its strengths' }
}
