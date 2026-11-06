import { ENVIRONMENT_ASSIGNMENT_PATTERN } from './constants/ENVIRONMENT_ASSIGNMENT_PATTERN'
import { SECRET_VARIABLE_NAME_PATTERN } from './constants/SECRET_VARIABLE_NAME_PATTERN'
import { hasTokenShape } from './hasTokenShape'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace the value of an environment assignment whose name says what it
 * holds and whose value is token-shaped: `export RESEND_API_KEY=...` is a key,
 * `STOP_KEY = "Escape"` is a key binding and stays.
 */
export const redactEnvironmentSecretAssignments = (
  input: string,
): RedactedText => {
  let redactions = 0
  const text = input.replace(
    ENVIRONMENT_ASSIGNMENT_PATTERN,
    (whole, name: string, quote: string, value: string) => {
      if (!SECRET_VARIABLE_NAME_PATTERN.test(name) || !hasTokenShape(value))
        return whole
      redactions++
      // The match ends with the value.
      return `${whole.slice(0, whole.length - value.length)}[REDACTED:secret]`
    },
  )
  return { text, redactions }
}
