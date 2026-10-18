import type { ConversationCaptureStore } from '../ConversationCaptureStore'
import type { StoredConversationRecord } from '../types/StoredConversationRecord'

/** Every record the store holds, parsed as written (the v1 form), in id order. */
export const readStoredConversationRecords = (
  store: ConversationCaptureStore,
) =>
  [...store.serializedRecords()].map(
    (line) => JSON.parse(line) as StoredConversationRecord,
  )
