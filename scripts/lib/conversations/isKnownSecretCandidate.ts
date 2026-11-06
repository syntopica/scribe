import { KNOWN_SECRET_MIN_LENGTH } from './constants/KNOWN_SECRET_MIN_LENGTH'
import { hasTokenShape } from './hasTokenShape'

/**
 * Whether a value the redactor removed is replaced wherever else it appears.
 *
 * A labelled credential recurs bare in other sessions: the census of
 * 2026-11-06 found 298 removed values in 10,382 other fragments. A value with
 * letters and digits, no whitespace and at least eight characters is a token
 * worth chasing; a shorter or prose-shaped one would hit ordinary text.
 */
export const isKnownSecretCandidate = (value: string) =>
  value.length >= KNOWN_SECRET_MIN_LENGTH &&
  !/\s/u.test(value) &&
  !value.includes('[REDACTED:') &&
  hasTokenShape(value)
