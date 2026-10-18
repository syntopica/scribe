import { CONVERSATION_SCHEMA_VERSION } from './constants/CONVERSATION_SCHEMA_VERSION'
import { hashText } from './hashText'
import type { ConversationRecord } from './types/ConversationRecord'

/** The synthetic conversation the drill injects and erases: `marker` is its id and its text. */
export const createRecoveryDrillConversation = (
  marker: string,
  createdAt: string,
): ConversationRecord => ({
  schemaVersion: CONVERSATION_SCHEMA_VERSION,
  id: marker,
  source: 'claude-code',
  sourceId: marker,
  title: marker,
  events: [
    {
      id: `${marker}-e0`,
      kind: 'message',
      role: 'user',
      text: `recovery drill marker ${marker}`,
      timestamp: createdAt,
    },
  ],
  provenance: {
    contentSha256: hashText(marker),
    relativePath: [`recovery-drill/${marker}.jsonl`],
    redactions: 0,
  },
})
