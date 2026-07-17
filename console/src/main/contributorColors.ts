// Shared contributor colors. `contributor-colors.json` on the decomp repo's default branch maps
// GitHub login -> hex color. Every console fetches it (raw, TTL-cached, local-clone fallback) and
// overrides the generated legend palette with it, so a color one contributor picks shows up on
// EVERYONE's Atlas. Setting a color is gated on being signed into GitHub, edits ONLY the caller's
// own login key (the merge happens here, server-side of the renderer - the UI can't write anyone
// else's), and lands through the GitHub Contents API as a direct commit to the default branch.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const COLORS_FILE = 'contributor-colors.json'
const HEX = /^#[0-9a-fA-F]{6}$/

async function gh(
  path: string,
  token: string,
  init?: { method?: string; body?: unknown }
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`https://api.github.com${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'tangOS'
    },
    body: init?.body ? JSON.stringify(init.body) : undefined
  })
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* empty body */
  }
  return { status: res.status, json }
}

// Who the stored token belongs to - cached per token so the legend doesn't re-hit /user.
let viewerCache: { token: string; login: string | null } | null = null
export async function viewerLogin(token?: string): Promise<string | null> {
  if (!token) return null
  if (viewerCache?.token === token) return viewerCache.login
  try {
    const r = await gh('/user', token)
    const login = r.status === 200 ? ((r.json as { login?: string })?.login ?? null) : null
    viewerCache = { token, login }
    return login
  } catch {
    return null
  }
}

function parseColors(text: string): Record<string, string> {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'string' && HEX.test(v)) out[k] = v
    return out
  } catch {
    return {}
  }
}

// Fetched copy, TTL-cached so the Atlas doesn't hammer raw.githubusercontent. Busted on a set.
let colorsCache: { key: string; at: number; colors: Record<string, string> } | null = null
const COLORS_TTL_MS = 60_000

export function bustColorsCache(): void {
  colorsCache = null
}

/** The shared color map: raw fetch off the default branch (everyone sees updates within the TTL
 *  without pulling), falling back to the local clone's copy when offline. */
export async function fetchColors(
  slug: { owner: string; repo: string } | null,
  branch: string,
  repoPath: string | null
): Promise<Record<string, string>> {
  const key = slug ? `${slug.owner}/${slug.repo}@${branch}` : (repoPath ?? '')
  if (colorsCache?.key === key && Date.now() - colorsCache.at < COLORS_TTL_MS) return colorsCache.colors
  let colors: Record<string, string> = {}
  if (slug) {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${slug.owner}/${slug.repo}/${branch}/${COLORS_FILE}`)
      if (r.ok) colors = parseColors(await r.text())
    } catch {
      /* offline - fall through to the local copy */
    }
  }
  if (!Object.keys(colors).length && repoPath) {
    try {
      colors = parseColors(readFileSync(join(repoPath, COLORS_FILE), 'utf8'))
    } catch {
      /* no local file either */
    }
  }
  colorsCache = { key, at: Date.now(), colors }
  return colors
}

/** Set the CALLER's color: merge their login's key into the upstream file and commit via the
 *  Contents API (base sha handled, so concurrent writers get a clean 409 to retry). Only the
 *  caller's own key can change - the merged file is built here from upstream + one entry. */
export async function setMyColor(
  slug: { owner: string; repo: string },
  branch: string,
  token: string,
  color: string
): Promise<{ ok: boolean; login?: string; error?: string }> {
  if (!HEX.test(color)) return { ok: false, error: 'color must be #rrggbb' }
  const login = await viewerLogin(token)
  if (!login) return { ok: false, error: 'could not resolve your GitHub login - sign in again in Settings' }
  const path = `/repos/${slug.owner}/${slug.repo}/contents/${COLORS_FILE}`
  // Current file (sha needed for an update; 404 = first color ever, create the file).
  let sha: string | undefined
  let existing: Record<string, string> = {}
  const cur = await gh(`${path}?ref=${encodeURIComponent(branch)}`, token)
  if (cur.status === 200) {
    const j = cur.json as { sha?: string; content?: string; encoding?: string }
    sha = j.sha
    if (j.content) existing = parseColors(Buffer.from(j.content, 'base64').toString('utf8'))
  } else if (cur.status !== 404) {
    return { ok: false, error: `could not read ${COLORS_FILE} (HTTP ${cur.status})` }
  }
  if (existing[login] === color) return { ok: true, login } // already set - nothing to write
  const merged = { ...existing, [login]: color }
  const body = JSON.stringify(merged, null, 2) + '\n'
  const put = await gh(path, token, {
    method: 'PUT',
    body: {
      message: `chore: contributor color for ${login}`,
      content: Buffer.from(body, 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {})
    }
  })
  if (put.status === 200 || put.status === 201) {
    bustColorsCache()
    return { ok: true, login }
  }
  if (put.status === 403 || put.status === 404) {
    return {
      ok: false,
      login,
      error: 'your GitHub account cannot push to this repo - ask a maintainer to set your color (or get collaborator access)'
    }
  }
  if (put.status === 409) return { ok: false, login, error: 'someone else just updated the colors - try again' }
  return { ok: false, login, error: `GitHub rejected the update (HTTP ${put.status})` }
}
