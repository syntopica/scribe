import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { planConversationArchiveErasure } from './planConversationArchiveErasure'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import type { ConversationFragmentReference } from './types/ConversationFragmentReference'
import type { PlanConversationArchiveErasureFromRootOptions } from './types/PlanConversationArchiveErasureFromRootOptions'

/**
 * Plan an erasure against the archive's current generation, in bounded memory.
 *
 * Segments are read one at a time and only each entry's conversation id and
 * fragment hash are kept, so the plan costs a few dozen bytes per fragment
 * rather than the corpus. Every segment is read through the generation
 * barrier: a plan computed over a segment from another generation would bind
 * itself to a corpus apply will refuse.
 */
export const planConversationArchiveErasureFromRoot = async (
  options: PlanConversationArchiveErasureFromRootOptions,
) => {
  const { generation, segments } = await readConversationArchiveGeneration(
    options.root,
  )
  const present = await listConversationArchiveSegments(segments)
  const entries: ConversationFragmentReference[] = []
  for (const sha256 of present) {
    const segment = await readConversationArchiveSegment({
      segmentsDirectory: segments,
      sha256,
      generation,
    })
    for (const entry of segment.entries) {
      entries.push({
        conversationId: entry.conversationId,
        fragmentSha256: entry.fragmentSha256,
      })
    }
  }
  return planConversationArchiveErasure({
    entries,
    segmentSha256: present,
    fromGenerationId: generation.generationId,
    createdAt: options.createdAt,
    reason: options.reason,
    ...(options.removeFragmentSha256 === undefined
      ? {}
      : { removeFragmentSha256: options.removeFragmentSha256 }),
    ...(options.removeConversationIds === undefined
      ? {}
      : { removeConversationIds: options.removeConversationIds }),
  })
}
