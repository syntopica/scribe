import { NEEDLE_HASH_BASE } from './constants/NEEDLE_HASH_BASE'
import { NEEDLE_PREFIX_LENGTH } from './constants/NEEDLE_PREFIX_LENGTH'
import { hashTextWindow } from './hashTextWindow'

/**
 * A test for whether a text contains any of `needles`, in one pass over it.
 *
 * Testing each needle with `includes` costs texts times needles: a redaction
 * of 1,630 conversations carries about ten thousand needles, and the verify
 * that scanned a 14 GB generation that way ran past an hour (2026-11-06). Here
 * a rolling hash of every window of `NEEDLE_PREFIX_LENGTH` units is looked up
 * among the needles' prefixes, and only a hit is compared exactly.
 */
export const createNeedleMatcher = (needles: Iterable<string>) => {
  const width = NEEDLE_PREFIX_LENGTH
  const short: string[] = []
  const byPrefix = new Map<number, string[]>()
  for (const needle of needles) {
    if (needle.length < width) {
      if (needle !== '') short.push(needle)
      continue
    }
    const hash = hashTextWindow(needle, 0, width)
    byPrefix.set(hash, [...(byPrefix.get(hash) ?? []), needle])
  }
  // BASE^(width - 1), to take the leaving unit out of the window.
  let leading = 1
  for (let index = 1; index < width; index++)
    leading = Math.imul(leading, NEEDLE_HASH_BASE) >>> 0

  return (text: string) => {
    if (short.some((needle) => text.includes(needle))) return true
    if (byPrefix.size === 0 || text.length < width) return false
    let hash = hashTextWindow(text, 0, width)
    for (let start = 0; ; start++) {
      const candidates = byPrefix.get(hash)
      if (candidates?.some((needle) => text.startsWith(needle, start)))
        return true
      if (start + width >= text.length) return false
      const leaving = Math.imul(text.charCodeAt(start), leading)
      hash =
        (Math.imul((hash - leaving) >>> 0, NEEDLE_HASH_BASE) +
          text.charCodeAt(start + width)) >>>
        0
    }
  }
}
