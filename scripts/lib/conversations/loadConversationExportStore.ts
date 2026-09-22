import type { ConversationCaptureStore } from './ConversationCaptureStore'
import { streamConversationExport } from './streamConversationExport'
import type { ConversationStoreChange } from './types/ConversationStoreChange'

export const loadConversationExportStore = async (
  input: string,
  store: ConversationCaptureStore,
  changes?: Record<ConversationStoreChange, number>,
) =>
  streamConversationExport(input, (record) => {
    // Merged, not replaced. Two archives exchanging revisions of the same
    // conversation have no later-is-better relation between them: replacing
    // let whichever arrived last win, so a host importing an older remote
    // revision silently dropped the events only it still had.
    const change = store.mergeFragment(record)
    if (changes !== undefined) changes[change]++
  })
