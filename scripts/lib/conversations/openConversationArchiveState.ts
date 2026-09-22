import { promises as fs } from 'node:fs'
import { ConversationArchiveState } from './ConversationArchiveState'
import { CONVERSATION_ARCHIVE_STATE_SCHEMA_VERSION } from './constants/CONVERSATION_ARCHIVE_STATE_SCHEMA_VERSION'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import type { ConversationArchiveGeneration } from './types/ConversationArchiveGeneration'

/**
 * Bring the disposable state up to the segments on disk, or start it over.
 *
 * Three conditions mean the file is worthless rather than stale: it fails its
 * own integrity check, it was written by a different state schema, or it
 * describes a different generation. In each case it is deleted and rebuilt
 * from the segments, because the segments are the archive and this is only a
 * cache of what they already say.
 *
 * A generation change matters most. After an erasure the archive holds the
 * same conversation ids and different bytes; a state file carried across that
 * boundary would keep answering "already published" for fragments the erasure
 * removed, and the next capture would quietly decline to republish the
 * sanitized ones.
 */
export const openConversationArchiveState = async (options: {
  statePath: string
  generation: ConversationArchiveGeneration
  segmentsDirectory: string
}) => {
  const open = () => new ConversationArchiveState(options.statePath)
  let state = open()
  const stale =
    !state.integrityCheck() ||
    state.meta('schemaVersion') !==
      String(CONVERSATION_ARCHIVE_STATE_SCHEMA_VERSION) ||
    (state.meta('generationId') !== undefined &&
      state.meta('generationId') !== options.generation.generationId)

  // Any stale file is replaced, including one that has ingested nothing: the
  // schema is written by CREATE TABLE IF NOT EXISTS, so a file from an older
  // schema keeps its old columns and fails on the first row that needs a new
  // one. "Rebuilt" is reported only when something was actually thrown away.
  let rebuilt = false
  if (stale) {
    rebuilt = state.counts().segments > 0
    state.close()
    await fs.rm(options.statePath, { force: true })
    state = open()
  }
  state.setMeta(
    'schemaVersion',
    String(CONVERSATION_ARCHIVE_STATE_SCHEMA_VERSION),
  )
  state.setMeta('generationId', options.generation.generationId)

  const present = await listConversationArchiveSegments(
    options.segmentsDirectory,
  )
  const touched = new Set<string>()
  let replayed = 0
  for (const sha256 of present) {
    if (state.hasSegment(sha256)) continue
    const segment = await readConversationArchiveSegment({
      segmentsDirectory: options.segmentsDirectory,
      sha256,
      generation: options.generation,
    })
    for (const id of state.addSegment({
      sha256,
      entries: segment.entries,
      createdAt: segment.header.createdAt,
    })) {
      touched.add(id)
    }
    replayed++
  }
  for (const id of touched) state.materialize(id)
  return { state, replayed, rebuilt, touched: [...touched] }
}
