import type { RedactedText } from './types/RedactedText'

export const applyRedactionPattern = (
  input: string,
  pattern: RegExp,
  replacement: string,
): RedactedText => ({
  text: input.replace(pattern, replacement),
  redactions: [...input.matchAll(pattern)].length,
})
