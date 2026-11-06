/**
 * Whether the text between a BEGIN and an END marker can be a key: base64,
 * whitespace, `\n` escapes and the two RFC 1421 headers, nothing else.
 *
 * A lazy `.*?` from BEGIN to END ran from a truncated key to the next END
 * marker 6,861 characters on (2026-11-06), taking the prose between; its host
 * names then spread as removed values to 1,300 fragments.
 */
export const isPrivateKeyMaterial = (text: string) =>
  /^[\sA-Za-z0-9+/=\\]*$/u.test(
    text.replaceAll(/(?:Proc-Type|DEK-Info): [A-Za-z0-9,-]+/gu, ''),
  )
