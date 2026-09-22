import { createHash } from 'node:crypto'
import { CONVERSATION_SCHEMA_VERSION } from './constants/CONVERSATION_SCHEMA_VERSION'
import { CONVERSATION_WORKSPACE_KEYS } from './constants/CONVERSATION_WORKSPACE_KEYS'
import { SESSION_ID_KEYS } from './constants/SESSION_ID_KEYS'
import { conversationEventFromRecord } from './conversationEventFromRecord'
import { conversationSourceId } from './conversationSourceId'
import { conversationTitle } from './conversationTitle'
import { conversationWorkspace } from './conversationWorkspace'
import { findStringByKeys } from './findStringByKeys'
import { forEachLfLine } from './forEachLfLine'
import { hashText } from './hashText'
import { isSessionMetadataRecord } from './isSessionMetadataRecord'
import { parseJsonValue } from './parseJsonValue'
import { qualifyConversationEventIds } from './qualifyConversationEventIds'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationEvent } from './types/ConversationEvent'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * Normalizes a line-delimited artifact without ever holding the whole file:
 * the 64 MiB bound applies to a single record instead of to the file, which is
 * what `readTextConversationDocument` enforces. Events accumulate, the source
 * hash is computed over the chunks as they arrive, and only the three records
 * that can still decide identity are retained -- the first `session_meta`, the
 * first carrying a session id, and the first carrying a workspace -- so
 * `conversationSourceId` and `conversationWorkspace` see the same records in
 * the same order they would have seen in the whole-document path.
 */
export const streamJsonlConversationRecord = async (
  artifact: ConversationArtifact,
): Promise<ConversationRecord | undefined> => {
  const events: ConversationEvent[] = []
  const identity: { index: number; record: unknown }[] = []
  const hash = createHash('sha256')
  let redactions = 0
  let index = 0
  let sessionMetadataSeen = false
  let sessionIdSeen = false
  let workspaceRecord: { record: unknown } | undefined

  await forEachLfLine(
    artifact.path,
    (line) => {
      // Trimmed exactly as the whole-document path trims it: a leading BOM is
      // not JSON whitespace, so parsing the raw line would reject a file the
      // non-streaming path accepts.
      const trimmed = line.trim()
      if (trimmed === '') return
      const record = parseJsonValue(trimmed)
      if (record === undefined) {
        throw new Error(
          `invalid conversation JSON at line ${String(index + 1)}`,
        )
      }

      if (!sessionMetadataSeen && isSessionMetadataRecord(record)) {
        sessionMetadataSeen = true
        identity.push({ index, record })
      }
      if (
        !sessionIdSeen &&
        findStringByKeys(record, SESSION_ID_KEYS) !== undefined
      ) {
        sessionIdSeen = true
        identity.push({ index, record })
      }
      if (
        workspaceRecord === undefined &&
        findStringByKeys(record, CONVERSATION_WORKSPACE_KEYS) !== undefined
      ) {
        workspaceRecord = { record }
      }

      const extracted = conversationEventFromRecord(record, index)
      redactions += extracted.redactions
      if (extracted.event !== undefined) events.push(extracted.event)
      index++
    },
    (chunk) => hash.update(chunk),
  )

  if (events.length === 0) return undefined

  const sourceId = conversationSourceId(
    identity
      .toSorted((left, right) => left.index - right.index)
      .map((entry) => entry.record),
    artifact.relativePath,
  )
  const timestamps = events
    .flatMap((event) =>
      event.timestamp === undefined ? [] : [event.timestamp],
    )
    .toSorted((left, right) => left.localeCompare(right))
  const startedAt = timestamps.at(0)
  const updatedAt = timestamps.at(-1)
  const id = hashText(`${artifact.source}\0${sourceId}`)
  const workspace =
    workspaceRecord === undefined
      ? undefined
      : conversationWorkspace([workspaceRecord.record])

  return {
    schemaVersion: CONVERSATION_SCHEMA_VERSION,
    id,
    source: artifact.source,
    sourceId,
    title: conversationTitle(events, sourceId),
    events: qualifyConversationEventIds(events, id),
    provenance: {
      contentSha256: hash.digest('hex'),
      relativePath: artifact.relativePath,
      redactions,
    },
    ...(startedAt === undefined || updatedAt === undefined
      ? {}
      : { startedAt, updatedAt }),
    ...(workspace === undefined ? {} : { workspace }),
  }
}
