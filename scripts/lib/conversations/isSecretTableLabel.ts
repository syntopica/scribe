import { CREDENTIAL_LABEL_MAX_WORDS } from './constants/CREDENTIAL_LABEL_MAX_WORDS'
import { CREDENTIAL_LABEL_PREFIXES } from './constants/CREDENTIAL_LABEL_PREFIXES'
import { CREDENTIAL_LABEL_SUFFIXES } from './constants/CREDENTIAL_LABEL_SUFFIXES'
import { isTaxReferenceLabel } from './isTaxReferenceLabel'

/**
 * Accept English/Spanish credential labels, qualified or not, with Markdown
 * decoration: the last words (English) or the first word (Spanish) name a
 * credential. Exact-only matching let "MySQL password", "HMAC secret" and "API
 * token" values through Atrium's redactor (2026-11-05).
 */
export const isSecretTableLabel = (cell: string) => {
  let label = cell.replaceAll(/[`*]/gu, '').replaceAll('_', ' ').trim()
  while (label.endsWith(':')) label = label.slice(0, -1)
  label = label.toLowerCase()
  const words = label
    .replaceAll(/[-\s]+/gu, ' ')
    .trim()
    .split(' ')
  const [first = ''] = words
  if (first === '' || words.length > CREDENTIAL_LABEL_MAX_WORDS) return false
  const joined = words.join(' ')
  return (
    CREDENTIAL_LABEL_SUFFIXES.some(
      (suffix) => joined === suffix || joined.endsWith(` ${suffix}`),
    ) ||
    (CREDENTIAL_LABEL_PREFIXES.includes(first) && !isTaxReferenceLabel(words))
  )
}
