/** The RFC 1421 header of an encrypted PEM key, as regex source. */
export const ESCAPED_PRIVATE_KEY_HEADER_SOURCE =
  '(?:Proc-Type|DEK-Info): [A-Za-z0-9,-]+'
