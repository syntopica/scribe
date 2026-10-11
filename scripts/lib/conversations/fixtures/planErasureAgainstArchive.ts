import { planConversationArchiveErasureFromRoot } from '../planConversationArchiveErasureFromRoot'
import type { PlanErasureAgainstArchiveOptions } from '../types/PlanErasureAgainstArchiveOptions'

/** An erasure plan computed from what a test archive holds right now. */
export const planErasureAgainstArchive = async (
  options: PlanErasureAgainstArchiveOptions,
) =>
  planConversationArchiveErasureFromRoot({
    ...options,
    createdAt: '2026-10-11T12:00:00.000Z',
    reason: 'erasure',
  })
