import { holdsEscapedPrivateKey } from './holdsEscapedPrivateKey'
import { isPemBodyLine } from './isPemBodyLine'
import { isPrivateKeyMarkerLine } from './isPrivateKeyMarkerLine'
import { opensPrivateKeyBlock } from './opensPrivateKeyBlock'
import { redactEscapedPrivateKeyLine } from './redactEscapedPrivateKeyLine'
import type { RedactedText } from './types/RedactedText'

/**
 * Replace each PEM private key block with one marker.
 *
 * A key escaped onto one line, as JSON prints it, is replaced within its line
 * whether or not truncation kept its END marker. Otherwise a block opens where
 * `opensPrivateKeyBlock` says, the text before the marker stays, and its body
 * lines go up to the END line (`isPemBodyLine`); the first line that cannot be
 * part of a key ends the block and stays.
 */
export const redactPrivateKeyBlocks = (input: string): RedactedText => {
  const lines = input.split('\n')
  const output: string[] = []
  let insidePrivateKey = false
  let redactions = 0

  for (const [index, line] of lines.entries()) {
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
    const opening = opensPrivateKeyBlock(line, lines[index + 1])
    if (opening === undefined) {
      output.push(line)
      continue
    }
    output.push(`${line.slice(0, opening)}[REDACTED:private-key]`)
    redactions++
    insidePrivateKey = true
  }

  return { text: output.join('\n'), redactions }
}
