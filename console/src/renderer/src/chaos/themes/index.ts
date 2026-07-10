import { classic } from './classic'
import { meier } from './meier'
import type { Theme } from './types'

export const THEMES: Theme[] = [classic, meier]

/** Unknown ids fall back to classic - this is also the sanitizer for persisted pref strings. */
export function getTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? classic
}
