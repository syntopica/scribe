import { redactSensitiveText } from './redactSensitiveText'
import type { KnownSecretRedactor } from './types/KnownSecretRedactor'
import type { RedactedText } from './types/RedactedText'

/**
 * One archived text through the pattern redactor, then through the values
 * already removed elsewhere in the archive when a redaction supplies them.
 */
export const redactConversationText = (
  text: string,
  redactKnown?: KnownSecretRedactor,
): RedactedText => {
  const patterned = redactSensitiveText(text)
  if (redactKnown === undefined) return patterned
  const known = redactKnown(patterned.text)
  return {
    text: known.text,
    redactions: patterned.redactions + known.redactions,
  }
}
