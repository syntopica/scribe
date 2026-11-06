import { INLINE_SECRET_PATTERN } from './constants/INLINE_SECRET_PATTERN'
import { hasTokenShape } from './hasTokenShape'
import { isInlineSecretLabel } from './isInlineSecretLabel'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace the value of an inline `Label: value` credential when the label
 * names one and the value has both letters and digits.
 *
 * Notes and messages keep credentials as bullets ("- Client secret: `...`",
 * "Token API Hetzner Cloud: ..."), which the assigned-key list never sees. A
 * value without both letters and digits is prose, not a token, and stays.
 */
export const redactLabelledInlineSecrets = (input: string): RedactedText => {
  let redactions = 0
  const text = input.replace(
    INLINE_SECRET_PATTERN,
    (whole, rawLabel: string, quote: string, value: string) => {
      const label =
        rawLabel
          .split(/[|*•;,/]| - /u)
          .at(-1)
          ?.trim() ?? ''
      if (!hasTokenShape(value) || !isInlineSecretLabel(label)) return whole
      redactions++
      // The match ends with the value and its closing quote.
      return `${whole.slice(0, whole.length - value.length - quote.length)}[REDACTED:secret]${quote}`
    },
  )
  return { text, redactions }
}
