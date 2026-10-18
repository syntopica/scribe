import { isSafeConversationRelativePath } from './isSafeConversationRelativePath'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * A v1 record as the v2 archive will hold it: each split path entry that is
 * empty, absolute or traversing is dropped. v1 checked only the joined string,
 * so such entries can exist there; the v2 format refuses them per entry. A
 * record left with no safe path at all is refused rather than invented one.
 */
export const migratableConversationRecord = (
  record: ConversationRecord,
): ConversationRecord => {
  const relativePath = record.provenance.relativePath.filter(
    isSafeConversationRelativePath,
  )
  if (relativePath.length === 0) {
    throw new Error(
      `conversation ${record.id} has no safe relativePath entry and cannot be migrated`,
    )
  }
  return { ...record, provenance: { ...record.provenance, relativePath } }
}
