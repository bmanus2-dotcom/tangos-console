export interface UpdateNote {
  id: string
  title: string
  body: string
}

/** The current "Tango says" announcement. Tango wears an unread badge until the
 *  user opens him and reads it; the id is remembered in settings so each note
 *  only nags once. For the next release: bump the id and rewrite the body. */
export const UPDATE_NOTE: UpdateNote = {
  id: 'audit-2026-07',
  title: 'New update!',
  body: 'Full audit patch: way less CPU, safer repo updates, and Stop now actually stops.'
}
