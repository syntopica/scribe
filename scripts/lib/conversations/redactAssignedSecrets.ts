import { applyRedactionPattern } from './applyRedactionPattern'
import type { RedactedText } from './types/RedactedText'

export const redactAssignedSecrets = (input: string): RedactedText => {
  let text = input
  let redactions = 0

  for (const key of [
    'api_key',
    'api-key',
    'apikey',
    'access_token',
    'access-token',
    'auth_token',
    'auth-token',
    'client_secret',
    'client-secret',
    'password',
    'passwd',
  ]) {
    const result = applyRedactionPattern(
      text,
      new RegExp(
        `(\\b${key}\\b\\s*[=:]\\s*)["']?(?!\\[REDACTED:)[^\\s,"'}]{8,}`,
        'giu',
      ),
      '$1[REDACTED:secret]',
    )
    text = result.text
    redactions += result.redactions
  }

  return { text, redactions }
}
