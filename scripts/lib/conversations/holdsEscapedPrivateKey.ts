/**
 * Whether a `-----BEGIN ... PRIVATE KEY-----` line carries the key escaped on
 * the same line, as JSON and tool output print it: `-----\n` with a literal
 * backslash. Such a line is not the opening line of a block, whether or not
 * its END marker survived truncation.
 */
export const holdsEscapedPrivateKey = (line: string) =>
  /PRIVATE KEY-----\\[rn]/u.test(line)
