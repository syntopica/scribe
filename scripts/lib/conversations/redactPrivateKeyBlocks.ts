import { closesPrivateKeyOnSameLine } from './closesPrivateKeyOnSameLine'
import { holdsEscapedPrivateKey } from './holdsEscapedPrivateKey'
import { isPemBodyLine } from './isPemBodyLine'
import { isPrivateKeyMarkerLine } from './isPrivateKeyMarkerLine'
import { redactEscapedPrivateKeyLine } from './redactEscapedPrivateKeyLine'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace each PEM private key block with one marker.
 *
 * A key escaped onto one line, as JSON prints it, is replaced within its line
 * whether or not truncation kept its END marker; a block opens only on a line
 * that holds neither, and its body lines go up to its END line. A line that
 * cannot be part of a key ends the block and stays: a BEGIN marker quoted in
 * prose took the 141 lines after it on 2026-11-06.
 */
export const redactPrivateKeyBlocks = (input: string): RedactedText => {
  const output: string[] = []
  let insidePrivateKey = false
  let redactions = 0

  for (const line of input.split('\n')) {
    if (insidePrivateKey && isPrivateKeyMarkerLine(line, 'END')) {
      insidePrivateKey = false
      continue
    }
    if (insidePrivateKey && isPemBodyLine(line)) continue
    insidePrivateKey = false
    if (holdsEscapedPrivateKey(line)) {
      const redacted = redactEscapedPrivateKeyLine(line)
      output.push(redacted.text)
      redactions += redacted.redactions
      continue
    }
    if (
      !isPrivateKeyMarkerLine(line, 'BEGIN') ||
      closesPrivateKeyOnSameLine(line)
    ) {
      output.push(line)
      continue
    }
    output.push('[REDACTED:private-key]')
    redactions++
    insidePrivateKey = true
  }

  return { text: output.join('\n'), redactions }
}
