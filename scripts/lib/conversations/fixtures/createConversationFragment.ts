import { CONVERSATION_SCHEMA_VERSION } from '../constants/CONVERSATION_SCHEMA_VERSION'
import type { ConversationEvent } from '../types/ConversationEvent'
import type { ConversationRecord } from '../types/ConversationRecord'

/**
 * One observed revision of a conversation, with a chosen number of events.
 *
 * Named after what it is in the segment format: a fragment, not a record. Two
 * fragments of one conversation differ in what their capture happened to see,
 * which is the case the reducer exists for.
 */
export const createConversationFragment = (options: {
  id: string
  events: number
  source?: string
  title?: string
  workspace?: string
}): ConversationRecord => {
  const events: ConversationEvent[] = Array.from(
    { length: options.events },
    (_unused, index) => ({
      id: `${options.id}-e${String(index)}`,
      kind: 'message' as const,
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      text: `event ${String(index)} of ${options.id}`,
      timestamp: `2026-08-31T00:${String(index).padStart(2, '0')}:00.000Z`,
    }),
  )
  return {
    schemaVersion: CONVERSATION_SCHEMA_VERSION,
    id: options.id,
    source: 'claude-code',
    sourceId: options.id,
    title: options.title ?? options.id,
    events,
    provenance: {
      contentSha256:
        options.source ?? `${options.id}-${String(options.events)}`,
      relativePath: `${options.source ?? options.id}.jsonl`,
      redactions: 0,
    },
    ...(options.workspace === undefined
      ? {}
      : { workspace: options.workspace }),
  }
}
