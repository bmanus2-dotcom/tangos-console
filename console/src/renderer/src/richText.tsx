import { Fragment, type ReactNode } from 'react'

// Lightweight inline markup for Tango's text boxes (tour + tips). Author text like:
//   Every download gives me :joke[fifty (50) food-pellets]!
// and the bracketed span renders as an animated gradient of the theme's brand colors
// (see .joke-text in app.css). Add more markers here the same way if we want them later.
const JOKE = /:joke\[([^\]]*)\]/g

/** Turn a plain string into React nodes, styling any :joke[...] spans. Safe on undefined. */
export function richText(text: string | undefined): ReactNode {
  if (!text) return text ?? ''
  const parts: ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  JOKE.lastIndex = 0
  while ((m = JOKE.exec(text)) !== null) {
    if (m.index > last) parts.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>)
    parts.push(
      <span className="joke-text" key={key++}>
        {m[1]}
      </span>
    )
    last = m.index + m[0].length
  }
  if (!parts.length) return text // no markup -> return the raw string untouched
  if (last < text.length) parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>)
  return parts
}
