import { applyRedactionPattern } from './applyRedactionPattern'
import { VENDOR_TOKEN_PATTERNS } from './constants/VENDOR_TOKEN_PATTERNS'
import { redactAssignedSecrets } from './redactAssignedSecrets'
import { redactEnvironmentSecretAssignments } from './redactEnvironmentSecretAssignments'
import { redactInlinePrivateKeys } from './redactInlinePrivateKeys'
import { redactLabelledInlineSecrets } from './redactLabelledInlineSecrets'
import { redactPrivateKeyBlocks } from './redactPrivateKeyBlocks'
import type { RedactedText } from './types/RedactedText'

export const redactSensitiveText = (input: string): RedactedText => {
  const privateKeys = redactPrivateKeyBlocks(input)
  const assigned = redactAssignedSecrets(privateKeys.text)
  const labelled = redactLabelledInlineSecrets(assigned.text)
  const environment = redactEnvironmentSecretAssignments(labelled.text)
  const inlineKeys = redactInlinePrivateKeys(environment.text)
  let text = inlineKeys.text
  let redactions =
    privateKeys.redactions +
    assigned.redactions +
    labelled.redactions +
    environment.redactions +
    inlineKeys.redactions

  for (const [pattern, replacement] of [
    [/\bBearer\s+(?!\[REDACTED:)\S{16,}/giu, 'Bearer [REDACTED:token]'],
    [/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu, '[REDACTED:aws-access-key]'],
    [/\bgh[oprsu]_[A-Za-z0-9]{20,}\b/gu, '[REDACTED:token]'],
    [/\bsk-[A-Za-z0-9_-]{20,}\b/gu, '[REDACTED:token]'],
    [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gu, '[REDACTED:token]'],
    [/(https?:\/\/)(?!\[REDACTED:)[^\s@]+@/giu, '$1[REDACTED:credentials]@'],
    ...VENDOR_TOKEN_PATTERNS,
  ] as const) {
    const result = applyRedactionPattern(text, pattern, replacement)
    text = result.text
    redactions += result.redactions
  }

  return { text, redactions }
}
