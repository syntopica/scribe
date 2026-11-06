/**
 * Whether a `-----BEGIN ... PRIVATE KEY-----` line also holds its END marker.
 *
 * A JSON-escaped key sits on one line with `\n` escapes inside it. Read as the
 * opening line of a block it never sees an END line, and the whole rest of the
 * text was taken out with it: 141 lines of a session in the 2026-11-06
 * redaction. Such a line is left to the vendor pattern, which removes the key
 * and keeps the rest of the line.
 */
export const closesPrivateKeyOnSameLine = (line: string) =>
  /-----END [A-Z0-9 ]*PRIVATE KEY-----/u.test(line)
