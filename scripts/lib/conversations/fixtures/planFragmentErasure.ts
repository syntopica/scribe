import { planConversationArchiveErasure } from '../planConversationArchiveErasure'
import type { ConversationErasurePlan } from '../types/ConversationErasurePlan'
import type { ConversationFragmentEntry } from '../types/ConversationFragmentEntry'

/** An erasure plan over already-validated entries, with the fixed test clock. */
export const planFragmentErasure = (options: {
  entries: ConversationFragmentEntry[]
  segmentSha256?: string[]
  removeFragmentSha256?: string[]
  removeConversationIds?: string[]
  reason?: ConversationErasurePlan['reason']
}) =>
  planConversationArchiveErasure({
    entries: options.entries,
    segmentSha256: options.segmentSha256 ?? ['segment-a'],
    fromGenerationId: 'gen-1',
    createdAt: '2026-08-31T23:30:00.000Z',
    reason: options.reason ?? 'redaction',
    ...(options.removeFragmentSha256 === undefined
      ? {}
      : { removeFragmentSha256: options.removeFragmentSha256 }),
    ...(options.removeConversationIds === undefined
      ? {}
      : { removeConversationIds: options.removeConversationIds }),
  })
