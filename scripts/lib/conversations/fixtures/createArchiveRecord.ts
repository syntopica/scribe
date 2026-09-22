import { CONVERSATION_SCHEMA_VERSION } from '../constants/CONVERSATION_SCHEMA_VERSION'
import type { ConversationRecord } from '../types/ConversationRecord'

/** A minimal valid record, identified by `id`, for archive-level tests. */
export const createArchiveRecord = (id: string): ConversationRecord => ({
  schemaVersion: CONVERSATION_SCHEMA_VERSION,
  id,
  source: 'claude-code',
  sourceId: id,
  title: id,
  events: [{ id: `${id}-e`, kind: 'message', role: 'user', text: id }],
  provenance: { contentSha256: id, relativePath: `${id}.jsonl`, redactions: 0 },
})
