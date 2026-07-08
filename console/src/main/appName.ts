// Imported FIRST in index.ts, before anything reads userData (secrets, tips, tour, settings).
// Two jobs:
//   1. Rename the app so its data folder is the identifiable "tangOS Console" instead of the
//      generic "console" (Electron derives userData from the app name).
//   2. Migrate the tangOS-owned files from the old "console" folder so saved API keys, the GitHub
//      sign-in, settings, tips, tour, and reports survive the rename.
// We copy ONLY our own files, one at a time. Copying the whole old folder throws on Chromium's
// locked cache/state files and aborts the migration (which once dropped the key vault); the cache
// dirs regenerate anyway. The uninstaller (build/installer.nsh) deletes "tangOS Console" so
// uninstall leaves nothing behind.
import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, cpSync, rmSync } from 'node:fs'

app.setName('tangOS Console')

const OWNED = [
  'tangos-secrets.json', // the key vault (API keys + GitHub token) - most important to carry over
  'tangos-settings.json',
  'tango-tips.txt',
  'tango-tour.txt',
  'tangos-reports'
]

try {
  const newDir = app.getPath('userData') // %APPDATA%\tangOS Console
  const oldDir = join(app.getPath('appData'), 'console') // %APPDATA%\console (pre-rename)
  if (oldDir !== newDir && existsSync(oldDir)) {
    mkdirSync(newDir, { recursive: true })
    for (const item of OWNED) {
      try {
        const src = join(oldDir, item)
        const dst = join(newDir, item)
        if (existsSync(src) && !existsSync(dst)) cpSync(src, dst, { recursive: true })
      } catch {
        /* skip just this item */
      }
    }
    // Only retire the old folder once the vault is confirmed safe in the new one (or there was none).
    const vaultSafe = !existsSync(join(oldDir, 'tangos-secrets.json')) || existsSync(join(newDir, 'tangos-secrets.json'))
    if (vaultSafe) {
      try {
        rmSync(oldDir, { recursive: true, force: true })
      } catch {
        /* leave it if locked; the uninstaller sweeps it too */
      }
    }
  }
} catch {
  /* best effort: a failed migration just means the app starts with a fresh data folder */
}
