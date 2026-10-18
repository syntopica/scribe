import { publishConversationSegment } from '../publishConversationSegment'
import { readConversationArchiveGeneration } from '../readConversationArchiveGeneration'
import { createConversationFragment } from './createConversationFragment'
import { createConversationSegment } from './createConversationSegment'

/** What a capture on this installation appends: one delta for conversation `id`. */
export const captureConversationDelta = async (root: string, id: string) => {
  const { generation, segments } = await readConversationArchiveGeneration(root)
  await publishConversationSegment({
    segmentsDirectory: segments,
    text: createConversationSegment(
      [createConversationFragment({ id, events: 2 })],
      generation.generationId,
    ),
  })
}
