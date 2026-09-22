import { applyRedactionPattern } from './applyRedactionPattern'
import { redactAssignedSecrets } from './redactAssignedSecrets'
import { redactPrivateKeyBlocks } from './redactPrivateKeyBlocks'
import type { RedactedText } from './types/RedactedText'

export const redactSensitiveText = (input: string): RedactedText => {
  const privateKeys = redactPrivateKeyBlocks(input)
  const assigned = redactAssignedSecrets(privateKeys.text)
  let text = assigned.text
  let redactions = privateKeys.redactions + assigned.redactions

  for (const [pattern, replacement] of [
    [/\bBearer\s+(?!\[REDACTED:)\S{16,}/giu, 'Bearer [REDACTED:token]'],
    [/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu, '[REDACTED:aws-access-key]'],
    [/\bgh[oprsu]_[A-Za-z0-9]{20,}\b/gu, '[REDACTED:token]'],
    [/\bsk-[A-Za-z0-9_-]{20,}\b/gu, '[REDACTED:token]'],
    [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gu, '[REDACTED:token]'],
    [/(https?:\/\/)(?!\[REDACTED:)[^\s@]+@/giu, '$1[REDACTED:credentials]@'],
  ] as const) {
    const result = applyRedactionPattern(text, pattern, replacement)
    text = result.text
    redactions += result.redactions
  }

  return { text, redactions }
}
