import { applyConversationArchiveErasure } from '../applyConversationArchiveErasure'
import { planConversationArchiveErasureFromRoot } from '../planConversationArchiveErasureFromRoot'
import type { ConversationRecord } from '../types/ConversationRecord'
import type { TestCleanupContext } from '../types/TestCleanupContext'
import { verifyConversationArchiveErasure } from '../verifyConversationArchiveErasure'
import { seedConversationSegmentArchive } from './seedConversationSegmentArchive'

/**
 * Seed an archive with `fragments`, then plan, apply and verify a redaction of
 * `conversationIds` against it, returning every step for the test to read.
 */
export const redactFragmentsInArchive = async (
  context: TestCleanupContext,
  fragments: ConversationRecord[],
  conversationIds: string[],
) => {
  const archive = await seedConversationSegmentArchive(context, fragments)
  const unredactable = new Set<string>()
  const plan = await planConversationArchiveErasureFromRoot({
    root: archive.root,
    createdAt: '2026-10-18T12:00:00.000Z',
    reason: 'redaction',
    removeConversationIds: conversationIds,
    unredactableConversationIds: unredactable,
  })
  const applied = await applyConversationArchiveErasure({
    root: archive.root,
    plan,
    createdAt: '2026-10-18T12:01:00.000Z',
  })
  const verified = await verifyConversationArchiveErasure({
    root: archive.root,
    plan,
    generationId: applied.generationId,
  })
  return { archive, plan, unredactable, applied, verified }
}
