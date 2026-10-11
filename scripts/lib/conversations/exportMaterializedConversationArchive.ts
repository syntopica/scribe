import { openConversationSegmentState } from './openConversationSegmentState'
import type { ExportConversationSegmentsOptions } from './types/ExportConversationSegmentsOptions'
import { writeConversationExportFromRecords } from './writeConversationExportFromRecords'

/**
 * Write every live conversation of the current generation as one full export.
 *
 * This is what Atrium ingests without `--partial`: on a rebuild, and on the
 * first refresh after a generation change, when only a full ingest's sweep can
 * remove the conversations an erasure took out. Records stream from the
 * disposable state in id order, so memory follows one record, not the corpus.
 * Pending deliveries are left alone; a full ingest supersedes them, and the
 * caller acknowledges with the file it ingested.
 */
export const exportMaterializedConversationArchive = async (
  options: ExportConversationSegmentsOptions,
) => {
  const { state, generation } = await openConversationSegmentState(options)
  try {
    const manifest = await writeConversationExportFromRecords({
      records: () => state.conversations(),
      output: options.output,
      now: options.now,
    })
    return { generationId: generation.generationId, manifest }
  } finally {
    state.close()
  }
}
