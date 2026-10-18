import type { ConversationEvent } from './types/ConversationEvent'

/**
 * The order events take in a materialized record: by timestamp alone.
 *
 * Callers sort stably over events already in source order
 * (`orderConversationEventsBySource`), so ties keep the order the source wrote
 * them in, and the sequence still never depends on which fragment arrived
 * first. Breaking ties by event id instead
 * shuffled same-second events by hash: on the real archive that reordered the
 * user and assistant messages of 3,418 conversations, mostly Codex sessions,
 * whose timestamps often share a second. Events without a timestamp sort
 * first.
 */
export const compareConversationEvents = (
  left: ConversationEvent,
  right: ConversationEvent,
) => (left.timestamp ?? '').localeCompare(right.timestamp ?? '')
