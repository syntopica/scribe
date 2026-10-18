import { isSafeConversationRelativePath } from './isSafeConversationRelativePath'

/**
 * The v1 form of `provenance.relativePath`, accepted exactly as v1 accepted
 * it: the joined string checked as a whole. That lets `a.jsonl,/etc/x`
 * through, which is why a v1 record's entries are checked again one by one
 * when it enters the v2 archive (`migratableConversationRecord`); tightening
 * it here would refuse records the live v1 refresh already holds.
 */
export const isLegacyConversationRelativePath = (
  value: unknown,
): value is string =>
  typeof value === 'string' && isSafeConversationRelativePath(value)
