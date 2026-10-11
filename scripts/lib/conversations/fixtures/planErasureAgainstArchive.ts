import { listConversationArchiveSegments } from '../listConversationArchiveSegments'
import { planConversationArchiveErasure } from '../planConversationArchiveErasure'
import { readConversationArchiveGeneration } from '../readConversationArchiveGeneration'
import { readConversationArchiveSegment } from '../readConversationArchiveSegment'
import type { ConversationFragmentEntry } from '../types/ConversationFragmentEntry'
import type { PlanErasureAgainstArchiveOptions } from '../types/PlanErasureAgainstArchiveOptions'

/** An erasure plan computed from what a test archive holds right now. */
export const planErasureAgainstArchive = async (
  options: PlanErasureAgainstArchiveOptions,
) => {
  const { generation, segments } = await readConversationArchiveGeneration(
    options.root,
  )
  const present = await listConversationArchiveSegments(segments)
  const entries: ConversationFragmentEntry[] = []
  for (const sha256 of present) {
    const segment = await readConversationArchiveSegment({
      segmentsDirectory: segments,
      sha256,
      generation,
    })
    entries.push(...segment.entries)
  }
  return planConversationArchiveErasure({
    entries,
    segmentSha256: present,
    fromGenerationId: generation.generationId,
    createdAt: '2026-10-11T12:00:00.000Z',
    reason: 'erasure',
    ...(options.removeFragmentSha256 === undefined
      ? {}
      : { removeFragmentSha256: options.removeFragmentSha256 }),
    ...(options.removeConversationIds === undefined
      ? {}
      : { removeConversationIds: options.removeConversationIds }),
  })
}
