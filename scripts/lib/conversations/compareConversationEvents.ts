import type { ConversationEvent } from './types/ConversationEvent'

/**
 * Which of two events no fragment orders goes first: the earlier timestamp,
 * with events lacking one first. Equal timestamps compare equal, so the caller
 * decides ties (`listConversationEventsByTime` uses first-seen order).
 */
export const compareConversationEvents = (
  left: ConversationEvent,
  right: ConversationEvent,
) => (left.timestamp ?? '').localeCompare(right.timestamp ?? '')
