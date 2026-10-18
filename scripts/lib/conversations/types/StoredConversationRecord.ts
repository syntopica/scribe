import type { ConversationProvenance } from './ConversationProvenance'
import type { ConversationRecord } from './ConversationRecord'

/**
 * A record as read off disk: v1 files join `relativePath` with commas, v2
 * files carry the array. `conversationRecordFromStored` resolves the two.
 */
export type StoredConversationRecord = Omit<
  ConversationRecord,
  'provenance'
> & {
  provenance: Omit<ConversationProvenance, 'relativePath'> & {
    relativePath: string | string[]
  }
}
