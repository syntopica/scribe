import { hashConversationSegmentSet } from './hashConversationSegmentSet'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { openConversationSegmentState } from './openConversationSegmentState'
import type { ConversationSegmentStateOptions } from './types/ConversationSegmentStateOptions'

/**
 * What an installation holds, cheaply: no segment payload is re-validated.
 *
 * Two installations compare inventories before moving bytes, and Atrium reads
 * one to decide whether its index is current: stale when `generationId`
 * differs from the generation it last ingested, or when `pendingDeliveries`
 * is not zero. Those two key names are part of the contract with Atrium.
 */
export const inventoryConversationSegmentArchive = async (
  options: ConversationSegmentStateOptions,
) => {
  const { state, generation, segments } =
    await openConversationSegmentState(options)
  try {
    const present = await listConversationArchiveSegments(segments)
    return {
      generationId: generation.generationId,
      baseSegments: generation.baseSegmentSha256.length,
      segments: present,
      segmentSetSha256: hashConversationSegmentSet(present),
      conversations: state.counts().conversations,
      pendingDeliveries: state.pendingDeliveries().length,
    }
  } finally {
    state.close()
  }
}
