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
 * `statePath`, however it was built, says what the segments say.
 */
export const digestConversationArchiveState = async (
  options: ConversationSegmentStateOptions,
) => {
  const { state, generation, segments, replayed } =
    await openConversationSegmentState(options)
  try {
    const conversationIds: string[] = []
    const eventKeys: string[] = []
    const recordBytes: string[] = []
    for (const record of state.conversations()) {
      conversationIds.push(record.id)
      for (const event of record.events)
        eventKeys.push(`${record.id} ${event.id}`)
      recordBytes.push(serializeCanonicalConversationRecord(record))
    }
    const byText = (left: string, right: string) => left.localeCompare(right)
    const digests: ConversationArchiveDigests = {
      generationId: generation.generationId,
      segmentSet: hashConversationSegmentSet(
        await listConversationArchiveSegments(segments),
      ),
      conversationIds: hashText(conversationIds.toSorted(byText).join('\n')),
      eventSet: hashText(eventKeys.toSorted(byText).join('\n')),
      materializedState: hashText(recordBytes.toSorted(byText).join('\n')),
    }
    return { replayed, digests }
  } finally {
    state.close()
  }
}
