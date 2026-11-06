import { PEM_BODY_PREFIX_MAX_LENGTH } from './constants/PEM_BODY_PREFIX_MAX_LENGTH'
import { isBase64Character } from './isBase64Character'
import { isPemHeaderLine } from './isPemHeaderLine'

/**
 * Whether a line inside an open PEM block is part of the key: blank, an RFC
 * 1421 header (`isPemHeaderLine`), or a base64 run behind at
 * most a short prefix without letters (`   12\t`, `> `, `│ `), as printouts
 * number or quote a key.
 *
 * Any other line ends the block and stays. Running a block to its END line
 * unconditionally took a whole database listing after a truncated key on
 * 2026-11-06, and its tax ids then spread as removed values to 15,183
 * fragments.
 */
export const isPemBodyLine = (line: string) => {
  const trimmed = line.trimEnd()
  if (trimmed.trim() === '') return true
  if (isPemHeaderLine(trimmed)) return true
  let start = trimmed.length
  while (start > 0 && isBase64Character(trimmed.charAt(start - 1))) start--
  const prefix = trimmed.slice(0, start)
  return (
    trimmed.length - start >= 4 &&
    prefix.length <= PEM_BODY_PREFIX_MAX_LENGTH &&
    !/[A-Za-z]/u.test(prefix)
  )
}
