import { ASSIGNED_SECRET_KEYS } from './constants/ASSIGNED_SECRET_KEYS'
import { isNonSecretValue } from './isNonSecretValue'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace the value of `api_key = ...`, `password: ...` and the other
 * assignments `ASSIGNED_SECRET_KEYS` names, unless the value is known not to
 * be a credential (`isNonSecretValue`).
 */
export const redactAssignedSecrets = (input: string): RedactedText => {
  let text = input
  let redactions = 0

  for (const key of ASSIGNED_SECRET_KEYS) {
    text = text.replace(
      new RegExp(
        `(\\b${key}\\b\\s*[=:]\\s*)["']?((?!\\[REDACTED:)[^\\s,"'}]{8,})`,
        'giu',
      ),
      (whole, prefix: string, value: string) => {
        if (isNonSecretValue(value)) return whole
        redactions++
        return `${prefix}[REDACTED:secret]`
      },
    )
  }

  return { text, redactions }
}
