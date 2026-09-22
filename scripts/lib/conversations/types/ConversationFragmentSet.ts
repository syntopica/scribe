import type { ConversationEventVariant } from './ConversationEventVariant'
import type { ConversationRecord } from './ConversationRecord'

/** What the reducer produces: one record, plus what it had to choose between. */
export interface ConversationFragmentSet {
  record: ConversationRecord
  conflicts: ConversationEventVariant[]
}
