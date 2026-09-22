import type { ConversationEvent } from './types/ConversationEvent'

/**
 * The order events take in a materialized record.
 *
 * By timestamp, then by id, so the sequence never depends on which fragment
 * arrived first. Events without a timestamp keep a stable place by id rather
 * than drifting to wherever the last merge put them.
 */
export const compareConversationEvents = (
  left: ConversationEvent,
  right: ConversationEvent,
) => {
  const byTime = (left.timestamp ?? '').localeCompare(right.timestamp ?? '')
  return byTime === 0 ? left.id.localeCompare(right.id) : byTime
}
