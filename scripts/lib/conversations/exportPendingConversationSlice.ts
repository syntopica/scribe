import { openConversationSegmentState } from './openConversationSegmentState'
import { readConversationGenerationLineage } from './readConversationGenerationLineage'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ExportConversationSegmentsOptions } from './types/ExportConversationSegmentsOptions'
import { writeConversationExportFromRecords } from './writeConversationExportFromRecords'

/**
 * Write the conversations Atrium has not been handed yet, as an export file.
 *
 * The slice is an ordinary export: the same manifest line and record shape a
 * full export carries, holding only the pending conversations, materialized
 * from every fragment the archive holds. Atrium ingests it with `--partial`,
 * which skips the sweep a full export triggers. Nothing is cleared here; the
 * slice stays pending until `acknowledgeConversationSlice` is given the file
 * Atrium actually ingested.
 */
export const exportPendingConversationSlice = async (
  options: ExportConversationSegmentsOptions,
) => {
  const { state, generation } = await openConversationSegmentState(options)
  try {
    const conversationIds = state.pendingDeliveries()
    const records = function* (): Generator<ConversationRecord> {
      for (const id of conversationIds) {
        const record = state.conversation(id)
        if (record !== undefined) yield record
      }
    }
    const manifest = await writeConversationExportFromRecords({
      records,
      output: options.output,
      now: options.now,
      generation: {
        generationId: generation.generationId,
        generationLineage: await readConversationGenerationLineage(
          options.root,
          generation,
        ),
      },
    })
    return {
      generationId: generation.generationId,
      conversationIds,
      manifest,
    }
  } finally {
    state.close()
  }
}
