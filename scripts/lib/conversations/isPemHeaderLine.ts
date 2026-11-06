/**
 * Whether a line is one of the two RFC 1421 headers an encrypted PEM key
 * carries, `Proc-Type: 4,ENCRYPTED` or `DEK-Info: ...`.
 *
 * Any `word: value` line read as a header on 2026-11-06: a config listing
 * after a double-escaped key opened a block and lost its hosts and key paths,
 * which then spread as removed values to 1,300 fragments.
 */
export const isPemHeaderLine = (line: string) =>
  /^(?:Proc-Type|DEK-Info): \S/u.test(line.trim())
