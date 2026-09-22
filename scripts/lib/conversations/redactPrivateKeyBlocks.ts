import type { RedactedText } from './types/RedactedText'

export const redactPrivateKeyBlocks = (input: string): RedactedText => {
  const lines = input.split('\n')
  const output: string[] = []
  let insidePrivateKey = false
  let redactions = 0

  for (const line of lines) {
    if (line.startsWith('-----BEGIN ') && line.includes('PRIVATE KEY-----')) {
      if (!insidePrivateKey) {
        output.push('[REDACTED:private-key]')
        redactions++
      }
      insidePrivateKey = true
      continue
    }
    if (
      insidePrivateKey &&
      line.startsWith('-----END ') &&
      line.includes('PRIVATE KEY-----')
    ) {
      insidePrivateKey = false
      continue
    }
    if (!insidePrivateKey) output.push(line)
  }

  return { text: output.join('\n'), redactions }
}
