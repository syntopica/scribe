import { materializeConversationFragmentSet } from '../materializeConversationFragmentSet'
import { serializeCanonicalConversationRecord } from '../serializeCanonicalConversationRecord'
import type { ConversationRecord } from '../types/ConversationRecord'

/** The canonical bytes a set of fragments reduces to, for order-independence tests. */
export const materializeFragmentBytes = (fragments: ConversationRecord[]) =>
  serializeCanonicalConversationRecord(
    materializeConversationFragmentSet(fragments).record,
  )
