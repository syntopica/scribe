import { HARNESS_TAG_BLOCK_PATTERN } from './constants/HARNESS_TAG_BLOCK_PATTERN'

/**
 * Whether a text is made of harness tag blocks and nothing else. One word of
 * the person's own outside every block - a prompt with a reminder appended -
 * and it is theirs.
 */
export const isHarnessOnlyText = (text: string): boolean => {
  const remainder = text.replaceAll(HARNESS_TAG_BLOCK_PATTERN, '')
  return remainder !== text && remainder.trim() === ''
}
