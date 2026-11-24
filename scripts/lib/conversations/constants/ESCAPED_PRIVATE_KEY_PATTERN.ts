import { ESCAPED_PRIVATE_KEY_HEADER_SOURCE } from './ESCAPED_PRIVATE_KEY_HEADER_SOURCE'

/**
 * An escaped PEM key within one line: the BEGIN marker, the base64 body with
 * its `\n` escapes (doubled when the JSON was escaped again) and, for an
 * encrypted key, the `Proc-Type` and `DEK-Info` headers, then the END marker
 * when truncation left it. The rest of the line stays. Built from a source
 * string so the header grammar stays out of the literal's complexity budget.
 */
export const ESCAPED_PRIVATE_KEY_PATTERN = new RegExp(
  `-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----(?:${ESCAPED_PRIVATE_KEY_HEADER_SOURCE}|\\\\+[rn]|[A-Za-z0-9+/=])+(?:-----END [A-Z0-9 ]*PRIVATE KEY-----)?`,
  'gu',
)
