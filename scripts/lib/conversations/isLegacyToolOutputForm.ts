import type { ConversationEvent } from './types/ConversationEvent'

/**
 * Whether `candidate` is the form an archived event had before tool output was
 * told apart from the user (2026-10-11): the same event, archived as
 * `role: "user"`, that a current capture reads as `role: "tool"`. Kind, text,
 * timestamp and id are all equal, because the id hashes index and text only.
 *
 * Merges keep this form whenever they meet both, so a conversation already in
 * the archive never changes an event's role - Atrium keys episodes and
 * revisions on those bytes - and only events new to the archive carry `tool`.
 */
export const isLegacyToolOutputForm = (
  candidate: ConversationEvent,
  other: ConversationEvent,
): boolean =>
  candidate.role === 'user' &&
  other.role === 'tool' &&
  candidate.id === other.id &&
  candidate.kind === other.kind &&
  candidate.text === other.text &&
  candidate.timestamp === other.timestamp
