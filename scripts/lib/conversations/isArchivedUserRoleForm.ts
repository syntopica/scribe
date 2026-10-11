import type { ConversationEvent } from './types/ConversationEvent'

/**
 * Whether `candidate` is the form an archived event had before 2026-10-11,
 * when tool output (`role: "tool"`) and harness-only text (`role: "system"`)
 * were told apart from the user: the same event, archived as `role: "user"`.
 * Kind, text, timestamp and id are all equal, because the id hashes index and
 * text only.
 *
 * Merges keep this form whenever they meet both, so a conversation already in
 * the archive never changes an event's role - Atrium keys episodes and
 * revisions on those bytes - and only events new to the archive carry the
 * newer role.
 */
export const isArchivedUserRoleForm = (
  candidate: ConversationEvent,
  other: ConversationEvent,
): boolean =>
  candidate.role === 'user' &&
  (other.role === 'tool' || other.role === 'system') &&
  candidate.id === other.id &&
  candidate.kind === other.kind &&
  candidate.text === other.text &&
  candidate.timestamp === other.timestamp
