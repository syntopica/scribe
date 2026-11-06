/**
 * An escaped PEM key within one line: the BEGIN marker, the base64 body with
 * its `\n` escapes, and the END marker when truncation left it. The rest of
 * the line stays.
 */
export const ESCAPED_PRIVATE_KEY_PATTERN =
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----(?:\\[rn]|[A-Za-z0-9+/=])+(?:-----END [A-Z0-9 ]*PRIVATE KEY-----)?/gu
