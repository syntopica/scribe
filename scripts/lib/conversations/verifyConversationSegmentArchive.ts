import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConversationArchiveState } from './ConversationArchiveState'
import { hashText } from './hashText'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import { serializeCanonicalConversationRecord } from './serializeCanonicalConversationRecord'

/**
 * Read the whole archive back and say what it contains, in comparable numbers.
 *
 * Verification never consults the disposable state that capture keeps. It
 * builds its own throwaway one, because the question it answers is whether the
 * segments on disk still say what they said, and a cache written by the same
 * run that wrote the segments cannot answer that.
 *
 * The four digests are the acceptance criteria for a sync: two installations
 * holding the same generation must agree on the segment set, the conversation
 * ids, the events, and the materialized bytes. Any one of them differing names
 * which layer diverged -- a missing object, a lost conversation, a dropped
 * event branch, or a reducer disagreement -- instead of leaving an operator to
 * diff four gigabytes.
 */
export const verifyConversationSegmentArchive = async (options: {
  root: string
}) => {
  const { generation, segments } = await readConversationArchiveGeneration(
    options.root,
  )
  const present = await listConversationArchiveSegments(segments)
  const problems = generation.baseSegmentSha256
    .filter((sha256) => !present.includes(sha256))
    .map(
      (sha256) => `base segment ${sha256} named by the generation is missing`,
    )

  const statePath = join(
    tmpdir(),
    `conversation-verify-${randomUUID()}.sqlite3`,
  )
  const state = new ConversationArchiveState(statePath)
  try {
    const touched = new Set<string>()
    let entries = 0
    for (const sha256 of present) {
      try {
        const segment = await readConversationArchiveSegment({
          segmentsDirectory: segments,
          sha256,
          generation,
        })
        entries += segment.entries.length
        for (const id of state.addSegment({
          sha256,
          entries: segment.entries,
          createdAt: segment.header.createdAt,
        })) {
          touched.add(id)
        }
      } catch (error) {
        problems.push(
          `segment ${sha256}: ${
            error instanceof Error ? error.message : 'unreadable'
          }`,
        )
      }
    }

    const conversationIds = [...touched].toSorted((left, right) =>
      left.localeCompare(right),
    )
    const eventKeys: string[] = []
    const recordBytes: string[] = []
    let conflicts = 0
    for (const id of conversationIds) {
      const materialized = state.materialize(id)
      conflicts += materialized.conflicts.length
      for (const event of materialized.record.events) {
        eventKeys.push(`${id} ${event.id}`)
      }
      recordBytes.push(
        serializeCanonicalConversationRecord(materialized.record),
      )
    }

    return {
      ok: problems.length === 0,
      generationId: generation.generationId,
      baseSegments: generation.baseSegmentSha256.length,
      segments: present.length,
      entries,
      conversations: conversationIds.length,
      events: eventKeys.length,
      conflicts,
      problems,
      digests: {
        segmentSet: hashText(present.join('\n')),
        conversationIds: hashText(conversationIds.join('\n')),
        eventSet: hashText(
          eventKeys
            .toSorted((left, right) => left.localeCompare(right))
            .join('\n'),
        ),
        materializedState: hashText(
          recordBytes
            .toSorted((left, right) => left.localeCompare(right))
            .join('\n'),
        ),
      },
    }
  } finally {
    state.close()
    await fs.rm(statePath, { force: true })
  }
}
