import { hashConversationSegmentSet } from './hashConversationSegmentSet'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { sealConversationRecordsAsGeneration } from './sealConversationRecordsAsGeneration'
import { streamConversationErasureSurvivors } from './streamConversationErasureSurvivors'
import type { ApplyConversationArchiveErasureOptions } from './types/ApplyConversationArchiveErasureOptions'

/**
 * Write the generation a reviewed erasure plan describes, and select nothing.
 *
 * The plan is refused unless the archive is still exactly the corpus it was
 * computed from: same current generation, same segment set. Every surviving
 * fragment is rewritten into the base of a new generation, so no old segment
 * -- and no byte of an erased fragment -- is copied into it; segments captured
 * since the last generation are folded into that base as well.
 *
 * The current reference is left alone. Cutover is a separate step, taken only
 * after every holder has the new generation and its verification passes, and
 * until the old generation is purged it is also the rollback.
 *
 * Writers must be frozen while this runs: a capture published between the
 * binding check and the seal would belong to the old generation only. The
 * freeze is the caller's precondition; this function does not take the lock
 * capture uses, because it holds no lock across a corpus-sized rewrite.
 */
export const applyConversationArchiveErasure = async (
  options: ApplyConversationArchiveErasureOptions,
) => {
  const { generation, segments } = await readConversationArchiveGeneration(
    options.root,
  )
  if (generation.generationId !== options.plan.fromGenerationId) {
    throw new Error(
      `the plan was computed against generation ${options.plan.fromGenerationId}, the archive is on ${generation.generationId}`,
    )
  }
  const present = await listConversationArchiveSegments(segments)
  if (hashConversationSegmentSet(present) !== options.plan.segmentSetSha256) {
    throw new Error(
      'the archive has moved since the plan was computed; plan it again',
    )
  }

  const planned = new Set(
    options.plan.conversations.flatMap((entry) => entry.removedFragmentSha256),
  )
  const removed = new Set<string>()
  const kept = new Set<string>()
  const sealed = await sealConversationRecordsAsGeneration({
    root: options.root,
    records: streamConversationErasureSurvivors({
      segmentsDirectory: segments,
      segmentSha256: present,
      generation,
      removing: planned,
      kept,
      removed,
    }),
    createdAt: options.createdAt,
    buckets: options.buckets ?? 32,
  })
  const unmatched = [...planned].filter((sha256) => !removed.has(sha256))
  return {
    fromGenerationId: generation.generationId,
    generationId: sealed.generationId,
    segments: sealed.segments,
    fragmentsKept: kept.size,
    fragmentsRemoved: removed.size,
    unmatched,
  }
}
