import { ENVIRONMENT_ASSIGNMENT_PATTERN } from './constants/ENVIRONMENT_ASSIGNMENT_PATTERN'
import { hasTokenShape } from './hasTokenShape'
import { isNonSecretValue } from './isNonSecretValue'
import { isSecretVariableName } from './isSecretVariableName'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace the value of an environment assignment whose name says what it
 * holds and whose value is token-shaped: `export RESEND_API_KEY=...` is a key,
 * `STOP_KEY = "Escape"` is a key binding and stays, and a URL is where a
 * credential goes, not one, as a code expression says how one is made.
 */
export const redactEnvironmentSecretAssignments = (
  input: string,
): RedactedText => {
  let redactions = 0
  const text = input.replace(
    ENVIRONMENT_ASSIGNMENT_PATTERN,
    (whole, name: string, quote: string, value: string) => {
      if (
        !isSecretVariableName(name) ||
        !hasTokenShape(value) ||
        value.includes('://') ||
        isNonSecretValue(value)
      )
        return whole
      redactions++
      // The match ends with the value.
      return `${whole.slice(0, whole.length - value.length)}[REDACTED:secret]`
    },
  )
  return { text, redactions }
}
