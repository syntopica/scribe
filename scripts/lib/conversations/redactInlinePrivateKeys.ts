import { PRIVATE_KEY_BEGIN_PATTERN } from './constants/PRIVATE_KEY_BEGIN_PATTERN'
import { PRIVATE_KEY_END_PATTERN } from './constants/PRIVATE_KEY_END_PATTERN'
import { PRIVATE_KEY_MARKER } from './constants/PRIVATE_KEY_MARKER'
import { isPrivateKeyMaterial } from './isPrivateKeyMaterial'
import { leadingKeyMaterialLength } from './leadingKeyMaterialLength'
import { redactKeyMaterialRuns } from './redactKeyMaterialRuns'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace each private key written inline, with `\n` escapes or on one line.
 *
 * A BEGIN marker pairs with the next END marker. When only key material lies
 * between (`isPrivateKeyMaterial`) the whole key goes; otherwise, and when no
 * END follows, the key runs after the marker go (`redactKeyMaterialRuns`) and
 * the prose stays, failing closed on a truncated key without taking the text
 * a lazy `BEGIN.*?END` took on 2026-11-06.
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
    const between =
      end === null ? '' : text.slice(bodyStart, bodyStart + end.index)
    if (end !== null && isPrivateKeyMaterial(between)) {
      text = `${text.slice(0, start)}${PRIVATE_KEY_MARKER}${text.slice(bodyStart + end.index + end[0].length)}`
      redactions++
      from = start + PRIVATE_KEY_MARKER.length
      continue
    }
    const segment =
      end === null
        ? text.slice(
            bodyStart,
            bodyStart + leadingKeyMaterialLength(text.slice(bodyStart)),
          )
        : between
    const runs = redactKeyMaterialRuns(segment)
    text = `${text.slice(0, bodyStart)}${runs.text}${text.slice(bodyStart + segment.length)}`
    redactions += runs.redactions
    from = bodyStart + runs.text.length
  }
  return { text, redactions }
}
