import { createJoinedTextDigest } from './createJoinedTextDigest'
import { hashConversationSegmentSet } from './hashConversationSegmentSet'
import { hashText } from './hashText'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { openConversationSegmentState } from './openConversationSegmentState'
import { serializeCanonicalConversationRecord } from './serializeCanonicalConversationRecord'
import type { ConversationArchiveDigests } from './types/ConversationArchiveDigests'
import type { ConversationSegmentStateOptions } from './types/ConversationSegmentStateOptions'

/**
 * The `verify-segments` digests, computed from the disposable state rather than
 * from a throwaway one: equal to the verifier's only if the state at
 * `statePath`, however it was built, says what the segments say. Records
 * are read one at a time, so memory follows one record.
 */
export const digestConversationArchiveState = async (
  options: ConversationSegmentStateOptions,
) => {
  const { state, generation, segments, replayed } =
    await openConversationSegmentState(options)
  try {
    const byText = (left: string, right: string) => left.localeCompare(right)
    // The verifier's order, not SQL's binary one: they differ for ids that are
    // not lowercase hex, and both digests are fed in this order.
    const conversationIds = state.conversationIds().toSorted(byText)
    const eventSet = createJoinedTextDigest()
    const materializedState = createJoinedTextDigest()
    for (const id of conversationIds) {
      const record = state.conversation(id)
      if (record === undefined) throw new Error(`conversation ${id} vanished`)
      for (const eventId of record.events
        .map((event) => event.id)
        .toSorted(byText))
        eventSet.add(`${record.id} ${eventId}`)
      materializedState.add(serializeCanonicalConversationRecord(record))
    }
    const digests: ConversationArchiveDigests = {
      generationId: generation.generationId,
      segmentSet: hashConversationSegmentSet(
        await listConversationArchiveSegments(segments),
      ),
      conversationIds: hashText(conversationIds.join('\n')),
      eventSet: eventSet.digest(),
      materializedState: materializedState.digest(),
    }
    return { replayed, digests }
  } finally {
    state.close()
  }
}
