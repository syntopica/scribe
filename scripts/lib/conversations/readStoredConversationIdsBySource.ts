import { openConversationSegmentState } from './openConversationSegmentState'
import type { ConversationSegmentStateOptions } from './types/ConversationSegmentStateOptions'
import type { ConversationSource } from './types/ConversationSource'

/** The ids of every materialized conversation one source contributed, sorted. */
export const readStoredConversationIdsBySource = async (
  options: ConversationSegmentStateOptions,
  source: ConversationSource,
) => {
  const { state } = await openConversationSegmentState(options)
  try {
    return [...state.conversations()]
      .filter((record) => record.source === source)
      .map((record) => record.id)
      .toSorted((left, right) => left.localeCompare(right))
  } finally {
    state.close()
  }
}
