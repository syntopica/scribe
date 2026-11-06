import { KEY_MATERIAL_RUN_MIN_LENGTH } from './constants/KEY_MATERIAL_RUN_MIN_LENGTH'
import { PRIVATE_KEY_MARKER } from './constants/PRIVATE_KEY_MARKER'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace every run of at least `KEY_MATERIAL_RUN_MIN_LENGTH` base64
 * characters and `\n` escapes, keeping the text around them: a key truncated
 * to `...` or split across quoted lines goes, the prose between stays.
 */
export const redactKeyMaterialRuns = (input: string): RedactedText => {
  let redactions = 0
  const text = input.replaceAll(
    new RegExp(
      `(?:\\\\+[rn]|[A-Za-z0-9+/=]){${String(KEY_MATERIAL_RUN_MIN_LENGTH)},}`,
      'gu',
    ),
    () => {
      redactions++
      return PRIVATE_KEY_MARKER
    },
  )
  return { text, redactions }
}
