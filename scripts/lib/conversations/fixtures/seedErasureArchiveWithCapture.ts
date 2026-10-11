import { publishConversationSegment } from '../publishConversationSegment'
import type { TestCleanupContext } from '../types/TestCleanupContext'
import { createConversationSegment } from './createConversationSegment'
import { ERASURE_FIXTURE_FRAGMENTS } from './ERASURE_FIXTURE_FRAGMENTS'
import { seedConversationSegmentArchive } from './seedConversationSegmentArchive'

/** A base generation plus one segment a later capture on `peer-b` appended. */
export const seedErasureArchiveWithCapture = async (
  context: TestCleanupContext,
) => {
  const { leaked, clean, other, captured } = ERASURE_FIXTURE_FRAGMENTS
  const seeded = await seedConversationSegmentArchive(context, [
    leaked,
    clean,
    other,
  ])
  await publishConversationSegment({
    segmentsDirectory: seeded.segments,
    text: createConversationSegment(
      [{ ...captured, hosts: ['peer-b'] }],
      seeded.generation.generationId,
    ),
  })
  return seeded
}
