import { CONVERSATION_SCHEMA_VERSION } from './constants/CONVERSATION_SCHEMA_VERSION'
import { conversationEventFromRecord } from './conversationEventFromRecord'
import { conversationSourceId } from './conversationSourceId'
import { conversationTitle } from './conversationTitle'
import { conversationWorkspace } from './conversationWorkspace'
import { hashText } from './hashText'
import { qualifyConversationEventIds } from './qualifyConversationEventIds'
import { recordsFromConversationDocument } from './recordsFromConversationDocument'
import type { ConversationDocument } from './types/ConversationDocument'
import type { ConversationEvent } from './types/ConversationEvent'
import type { ConversationRecord } from './types/ConversationRecord'

export const conversationRecordFromDocument = (
  document: ConversationDocument,
): ConversationRecord | undefined => {
  const records = recordsFromConversationDocument(document.contents)
  const events: ConversationEvent[] = []
  let redactions = 0

  for (const [index, record] of records.entries()) {
    const extracted = conversationEventFromRecord(record, index)
    redactions += extracted.redactions
    if (extracted.event !== undefined) events.push(extracted.event)
  }
  if (events.length === 0) return undefined

  const sourceId = conversationSourceId(records, document.sourceIdHint)
  const id = hashText(`${document.source}\0${sourceId}`)
  const timestamps = events.flatMap((event) =>
    event.timestamp === undefined ? [] : [event.timestamp],
  )
  const workspace = conversationWorkspace(records)
  const sortedTimestamps = timestamps.toSorted((left, right) =>
    left.localeCompare(right),
  )
  const startedAt = sortedTimestamps.at(0)
  const updatedAt = sortedTimestamps.at(-1)

  return {
    schemaVersion: CONVERSATION_SCHEMA_VERSION,
    id,
    source: document.source,
    sourceId,
    title: conversationTitle(events, sourceId),
    events: qualifyConversationEventIds(events, id),
    provenance: {
      contentSha256: hashText(document.contents),
      relativePath: document.relativePath,
      redactions,
    },
    ...(startedAt === undefined || updatedAt === undefined
      ? {}
      : { startedAt, updatedAt }),
    ...(workspace === undefined ? {} : { workspace }),
  }
}
