import { chunkConversationIds } from './chunkConversationIds'
import { CONVERSATION_STATE_BATCH_SIZE } from './constants/CONVERSATION_STATE_BATCH_SIZE'
import type { ConversationArchiveState } from './ConversationArchiveState'

/**
 * Rematerialize many conversations in bounded transactions, handing each
 * result to `each` in the order given.
 */
export const materializeConversations = (
  state: ConversationArchiveState,
  conversationIds: Iterable<string>,
  each: (
    conversationId: string,
    materialized: ReturnType<ConversationArchiveState['materialize']>,
  ) => void = () => undefined,
) => {
  for (const ids of chunkConversationIds(
    conversationIds,
    CONVERSATION_STATE_BATCH_SIZE,
  )) {
    state.transaction(() => {
      for (const id of ids) each(id, state.materialize(id))
    })
  }
}
