import type { ConversationCaptureStore } from '../ConversationCaptureStore'
import type { ConversationRecord } from '../types/ConversationRecord'

/** Every record the store holds, parsed, in id order. */
export const readStoredConversationRecords = (
  store: ConversationCaptureStore,
) =>
  [...store.serializedRecords()].map(
    (line) => JSON.parse(line) as ConversationRecord,
  )
