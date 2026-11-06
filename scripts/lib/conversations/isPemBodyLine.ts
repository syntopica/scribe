/**
 * Whether a line can sit inside a PEM block: base64, an RFC 1421 header such
 * as `Proc-Type: 4,ENCRYPTED`, or blank. A block that meets any other line was
 * a BEGIN marker quoted in prose, not a key, and ends there.
 */
export const isPemBodyLine = (line: string) => {
  const trimmed = line.trim()
  return (
    trimmed === '' ||
    /^[A-Za-z0-9+/=]+$/u.test(trimmed) ||
    /^[A-Za-z-]+: \S/u.test(trimmed)
  )
}
