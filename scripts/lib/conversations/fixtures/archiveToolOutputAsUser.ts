import type { ConversationRecord } from '../types/ConversationRecord'

/**
 * What the archive holds for a conversation captured before 2026-10-11: the
 * same record, with tool output archived as the user's.
 */
export const archiveToolOutputAsUser = (
  record: ConversationRecord,
): ConversationRecord => ({
  ...record,
  events: record.events.map((event) =>
    event.role === 'tool' ? { ...event, role: 'user' } : event,
  ),
})
