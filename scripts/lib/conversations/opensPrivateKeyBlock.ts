import { PRIVATE_KEY_BEGIN_PATTERN } from './constants/PRIVATE_KEY_BEGIN_PATTERN'
import { looksLikePemBodyLine } from './looksLikePemBodyLine'

/**
 * Where a PEM private key block opens on `line`, or `undefined` when it opens
 * none.
 *
 * A BEGIN marker with nothing after it opens a block, as does one with text
 * after it when the next line reads as key body: a quoted marker with its key
 * on the lines below, END lost to truncation, still goes. A marker followed by
 * text and then prose is prose about a key: opening a block on it took the 141
 * lines after it (2026-11-06). An open block runs to its END line whatever its
 * body lines look like, failing closed.
 */
export const opensPrivateKeyBlock = (
  line: string,
  next: string | undefined,
) => {
  const marker = PRIVATE_KEY_BEGIN_PATTERN.exec(line)
  if (marker === null) return undefined
  const after = line.slice(marker.index + marker[0].length)
  return after.trim() === '' || looksLikePemBodyLine(next)
    ? marker.index
    : undefined
}
