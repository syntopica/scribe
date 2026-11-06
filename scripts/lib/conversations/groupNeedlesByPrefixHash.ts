import { NEEDLE_PREFIX_LENGTH } from './constants/NEEDLE_PREFIX_LENGTH'
import { hashTextWindow } from './hashTextWindow'

/**
 * Needles of at least `NEEDLE_PREFIX_LENGTH` units keyed by the hash of their
 * prefix, longest first within a key, so a scan prefers the longest match.
 */
export const groupNeedlesByPrefixHash = (needles: Iterable<string>) => {
  const byPrefix = new Map<number, string[]>()
  for (const needle of needles) {
    if (needle.length < NEEDLE_PREFIX_LENGTH) continue
    const hash = hashTextWindow(needle, 0, NEEDLE_PREFIX_LENGTH)
    byPrefix.set(hash, [...(byPrefix.get(hash) ?? []), needle])
  }
  for (const group of byPrefix.values())
    group.sort((left, right) => right.length - left.length)
  return byPrefix
}
