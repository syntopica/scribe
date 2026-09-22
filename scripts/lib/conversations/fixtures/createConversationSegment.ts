import { serializeConversationSegment } from '../serializeConversationSegment'
import type { ConversationRecord } from '../types/ConversationRecord'

/** A segment with a fixed timestamp, so tests compare bytes rather than clocks. */
export const createConversationSegment = (
  fragments: ConversationRecord[],
  generationId = 'gen-1',
) =>
  serializeConversationSegment({
    fragments,
    generationId,
    createdAt: '2026-08-31T23:00:00.000Z',
  })
