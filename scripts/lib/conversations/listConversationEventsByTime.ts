import { compareConversationEvents } from './compareConversationEvents'
import type { ConversationEvent } from './types/ConversationEvent'

/**
 * Indices of `events` by timestamp, ties by index: the preference among events
 * that no fragment orders relative to each other.
 */
export const listConversationEventsByTime = (events: ConversationEvent[]) =>
  events
    .map((event, index) => ({ event, index }))
    .toSorted(
      (left, right) =>
        compareConversationEvents(left.event, right.event) ||
        left.index - right.index,
    )
    .map(({ index }) => index)
