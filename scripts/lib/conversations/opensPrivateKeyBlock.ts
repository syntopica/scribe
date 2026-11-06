import { isPrivateKeyMarkerLine } from './isPrivateKeyMarkerLine'

/**
 * Whether a line is the opening line of a PEM private key block: the BEGIN
 * marker with nothing after its closing dashes.
 *
 * `-----BEGIN OPENSSH PRIVATE KEY----- ... and the END marker` is prose about
 * a key, and opening a block on it took the 141 lines after it (2026-11-06).
 * The decision is made on this line alone: a block, once open, runs to its
 * END line whatever its body lines look like, so a key printed with line
 * numbers or quote prefixes still goes whole.
 */
export const opensPrivateKeyBlock = (line: string) =>
  isPrivateKeyMarkerLine(line, 'BEGIN') && /PRIVATE KEY-----\s*$/u.test(line)
