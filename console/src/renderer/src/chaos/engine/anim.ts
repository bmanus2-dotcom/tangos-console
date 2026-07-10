export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Overshoots to ~1.08 near the end - the bubble "pop". */
export function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
