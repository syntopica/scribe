import { holdsEscapedPrivateKey } from './holdsEscapedPrivateKey'
import { isPrivateKeyMarkerLine } from './isPrivateKeyMarkerLine'
import { opensPrivateKeyBlock } from './opensPrivateKeyBlock'
import { redactEscapedPrivateKeyLine } from './redactEscapedPrivateKeyLine'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace each PEM private key block with one marker.
 *
 * A key escaped onto one line, as JSON prints it, is replaced within its line
 * whether or not truncation kept its END marker; a block opens only on a line
 * that holds the bare BEGIN marker (`opensPrivateKeyBlock`), and everything
 * up to its END line goes: failing closed, so a key printed with prefixes on
 * its body lines is not cut short.
 */
export const redactPrivateKeyBlocks = (input: string): RedactedText => {
  const output: string[] = []
  let insidePrivateKey = false
  let redactions = 0

  for (const line of input.split('\n')) {
    if (insidePrivateKey) {
      insidePrivateKey = !isPrivateKeyMarkerLine(line, 'END')
      continue
    }
    if (holdsEscapedPrivateKey(line)) {
      const redacted = redactEscapedPrivateKeyLine(line)
      output.push(redacted.text)
      redactions += redacted.redactions
      continue
    }
    if (!opensPrivateKeyBlock(line)) {
      output.push(line)
      continue
    }
    output.push('[REDACTED:private-key]')
    redactions++
    insidePrivateKey = true
  }

  return { text: output.join('\n'), redactions }
}
