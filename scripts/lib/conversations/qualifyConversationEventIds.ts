import { hashText } from './hashText'
import type { ConversationEvent } from './types/ConversationEvent'

/**
 * Rebinds every event id to the conversation it belongs to. An id derived from
 * `event_index + text` alone collides across conversations - measured
 * 2026-08-27 on real archives: 17 collisions across 2,586 OpenCode records and
 * 73 across 67,568 Cursor records - because two sessions that open with the
 * same greeting produce the same first event. Consumers were left to key on
 * `(conversation_id, event_id)` themselves; carrying the identity in the id is
 * the same guarantee, made once here instead of in every reader.
 */
export const qualifyConversationEventIds = (
  events: ConversationEvent[],
  conversationId: string,
): ConversationEvent[] =>
  events.map((event) => ({
    ...event,
    id: hashText(`${conversationId}\0${event.id}`),
  }))
