import { PUBLIC_KEY_QUALIFIERS } from './constants/PUBLIC_KEY_QUALIFIERS'
import { SPANISH_TOKEN_LINKS } from './constants/SPANISH_TOKEN_LINKS'
import { isSecretTableLabel } from './isSecretTableLabel'

/** Accept a credential label, "Token de/API ...", or a "... key" no qualifier makes public. */
export const isInlineSecretLabel = (label: string) => {
  if (isSecretTableLabel(label)) return true
  const words = label
    .replaceAll(/[_-]/gu, ' ')
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)
  const [first, second] = words
  if (
    first === 'token' &&
    second !== undefined &&
    SPANISH_TOKEN_LINKS.includes(second)
  )
    return true
  const last = words.at(-1)
  if (last !== 'key' && last !== 'keys') return false
  // Any qualifying word: "next public turnstile site key", "cache restored
  // from key". A label naming a credential outright was accepted above.
  return (
    !PUBLIC_KEY_QUALIFIERS.includes(words.slice(0, -1).join(' ')) &&
    !words.some((word) => PUBLIC_KEY_QUALIFIERS.includes(word))
  )
}
