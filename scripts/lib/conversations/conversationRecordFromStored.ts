import { conversationRelativePathsFromStored } from './conversationRelativePathsFromStored'
import type { ConversationRecord } from './types/ConversationRecord'
import type { StoredConversationRecord } from './types/StoredConversationRecord'

export const conversationRecordFromStored = (
  record: StoredConversationRecord,
): ConversationRecord => ({
  ...record,
  provenance: {
    ...record.provenance,
    relativePath: conversationRelativePathsFromStored(
      record.provenance.relativePath,
    ),
  },
})
