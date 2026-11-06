import { PRIVATE_KEY_BEGIN_PATTERN } from './constants/PRIVATE_KEY_BEGIN_PATTERN'
import { PRIVATE_KEY_END_PATTERN } from './constants/PRIVATE_KEY_END_PATTERN'
import { isPrivateKeyMaterial } from './isPrivateKeyMaterial'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace each BEGIN ... END private key written inline, with `\n` escapes or
 * on one line, when only key material lies between its markers
 * (`isPrivateKeyMaterial`). A BEGIN marker that fails is skipped, so a real
 * key after it is still found.
 */
export const redactInlinePrivateKeys = (input: string): RedactedText => {
  let text = input
  let redactions = 0
  let from = 0
  for (;;) {
    const begin = PRIVATE_KEY_BEGIN_PATTERN.exec(text.slice(from))
    if (begin === null) break
    const start = from + begin.index
    const bodyStart = start + begin[0].length
    const end = PRIVATE_KEY_END_PATTERN.exec(text.slice(bodyStart))
    if (end === null) break
    if (!isPrivateKeyMaterial(text.slice(bodyStart, bodyStart + end.index))) {
      from = bodyStart
      continue
    }
    const marker = '[REDACTED:private-key]'
    text =
      text.slice(0, start) +
      marker +
      text.slice(bodyStart + end.index + end[0].length)
    redactions++
    from = start + marker.length
  }
  return { text, redactions }
}
