import { NEEDLE_PREFIX_LENGTH } from './constants/NEEDLE_PREFIX_LENGTH'
import { groupNeedlesByPrefixHash } from './groupNeedlesByPrefixHash'
import { hashTextWindow } from './hashTextWindow'
import { isBoundedOccurrence } from './isBoundedOccurrence'
import { leadingWindowWeight } from './leadingWindowWeight'
import { rollTextWindowHash } from './rollTextWindowHash'
import type { KnownSecretRedactor } from './types/KnownSecretRedactor'

/**
 * A redactor for the values already removed elsewhere in the archive.
 *
 * One pass per text: a rolling hash of every eight-unit window is looked up
 * among the values' prefixes, and the longest bounded value starting there is
 * replaced. A text holding none comes back as the same string.
 */
export const createKnownSecretRedactor = (
  values: Iterable<string>,
): KnownSecretRedactor => {
  const width = NEEDLE_PREFIX_LENGTH
  const byPrefix = groupNeedlesByPrefixHash(values)
  const leading = leadingWindowWeight(width)
  return (text) => {
    if (byPrefix.size === 0 || text.length < width)
      return { text, redactions: 0 }
    const pieces: string[] = []
    let copied = 0
    let redactions = 0
    let hash = hashTextWindow(text, 0, width)
    for (let start = 0; ; start++) {
      const value =
        start < copied
          ? undefined
          : byPrefix
              .get(hash)
              ?.find(
                (candidate) =>
                  text.startsWith(candidate, start) &&
                  isBoundedOccurrence(text, start, candidate.length),
              )
      if (value !== undefined) {
        pieces.push(text.slice(copied, start), '[REDACTED:secret]')
        copied = start + value.length
        redactions++
      }
      if (start + width >= text.length) break
      hash = rollTextWindowHash(
        hash,
        text.charCodeAt(start),
        text.charCodeAt(start + width),
        leading,
      )
    }
    if (redactions === 0) return { text, redactions }
    pieces.push(text.slice(copied))
    return { text: pieces.join(''), redactions }
  }
}
