// Imported FIRST in index.ts, before anything reads userData (secrets, tips, tour, settings).
// Two jobs:
//   1. Rename the app so its data folder is the identifiable "tangOS Console" instead of the
//      generic "console" (Electron derives userData from the app name).
//   2. Migrate the old "console" folder over so saved API keys, the GitHub sign-in, tips, and
//      the tour survive the rename, then remove the stale old folder.
// The uninstaller (build/installer.nsh) deletes "tangOS Console" so uninstall leaves nothing behind.
import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, cpSync, rmSync } from 'node:fs'

app.setName('tangOS Console')

try {
  const newDir = app.getPath('userData') // %APPDATA%\tangOS Console
  const oldDir = join(app.getPath('appData'), 'console') // %APPDATA%\console (pre-rename)
  if (oldDir !== newDir && existsSync(oldDir) && !existsSync(newDir)) {
    cpSync(oldDir, newDir, { recursive: true })
    try {
      rmSync(oldDir, { recursive: true, force: true })
    } catch {
      /* leave the old copy if it is locked; harmless, and uninstall sweeps it too */
    }
  }
} catch {
  /* best effort: a failed migration just means the app starts with a fresh data folder */
}
