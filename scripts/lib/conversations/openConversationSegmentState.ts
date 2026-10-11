import { openConversationArchiveState } from './openConversationArchiveState'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import type { ConversationSegmentStateOptions } from './types/ConversationSegmentStateOptions'

/**
 * Open the disposable state for the archive's current generation, caught up.
 *
 * Every command that reads materialized records or pending deliveries starts
 * here, so none of them can answer from a state that has not replayed the
 * segments a sync delivered since the last capture.
 */
export const openConversationSegmentState = async (
  options: ConversationSegmentStateOptions,
) => {
  const { generation, segments } = await readConversationArchiveGeneration(
    options.root,
  )
  const opened = await openConversationArchiveState({
    statePath: options.statePath,
    generation,
    segmentsDirectory: segments,
  })
  return { ...opened, generation, segments }
}
