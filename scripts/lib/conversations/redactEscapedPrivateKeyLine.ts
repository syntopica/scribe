import { ESCAPED_PRIVATE_KEY_PATTERN } from './constants/ESCAPED_PRIVATE_KEY_PATTERN'
import type { RedactedText } from './types/RedactedText'

/** One line with its escaped private keys replaced and the rest kept. */
export const redactEscapedPrivateKeyLine = (line: string): RedactedText => {
  let redactions = 0
  const text = line.replace(ESCAPED_PRIVATE_KEY_PATTERN, () => {
    redactions++
    return '[REDACTED:private-key]'
  })
  return { text, redactions }
}
