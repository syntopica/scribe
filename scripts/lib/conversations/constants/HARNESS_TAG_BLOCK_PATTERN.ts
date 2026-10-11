import { HARNESS_TAG_NAMES } from './HARNESS_TAG_NAMES'

/** One complete harness tag block, attributes allowed, matched lazily. */
export const HARNESS_TAG_BLOCK_PATTERN = new RegExp(
  String.raw`<(${HARNESS_TAG_NAMES.join('|')})(?:\s[^>]*)?>[\s\S]*?</\1>`,
  'g',
)
