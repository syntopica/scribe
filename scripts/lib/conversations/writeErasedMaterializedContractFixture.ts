import { activateConversationArchiveGeneration } from './activateConversationArchiveGeneration'
import { applyArchiveContractErasure } from './applyArchiveContractErasure'
import { ARCHIVE_CONTRACT_FIXTURE_CLOCK } from './constants/ARCHIVE_CONTRACT_FIXTURE_CLOCK'
import { createArchiveContractSegmentStore } from './createArchiveContractSegmentStore'
import { exportMaterializedConversationArchive } from './exportMaterializedConversationArchive'

/**
 * Write the full export an archive produces once the contract erasure is cut
 * over: the same erasure as `erasure-plan.json`, its generation selected, then
 * `export-materialized`. Its manifest names that plan's `toGenerationId` as
 * `generationId` and the plan's `fromGenerationId` as the one ancestor in
 * `generationLineage`, which is what Atrium checks before an erase.
 */
export const writeErasedMaterializedContractFixture = async (
  output: string,
) => {
  const store = await createArchiveContractSegmentStore()
  try {
    const plan = await applyArchiveContractErasure(store)
    if (plan.toGenerationId === undefined) {
      throw new Error('the contract erasure produced no generation')
    }
    await activateConversationArchiveGeneration({
      root: store.root,
      generationId: plan.toGenerationId,
      updatedAt: ARCHIVE_CONTRACT_FIXTURE_CLOCK,
    })
    return await exportMaterializedConversationArchive({
      ...store,
      output,
      now: new Date(ARCHIVE_CONTRACT_FIXTURE_CLOCK),
    })
  } finally {
    await store.cleanup()
  }
}
