import { activateConversationArchiveGeneration } from './activateConversationArchiveGeneration'
import { sealConversationArchiveGeneration } from './sealConversationArchiveGeneration'
import type { SealConversationArchiveGenerationOptions } from './types/SealConversationArchiveGenerationOptions'

/**
 * Seal a set of base segments into a generation and point the archive at it.
 *
 * The migration path, where there is nothing to switch away from: sealing and
 * selecting happen together. An erasure seals first and selects later, once
 * every holder has the new generation; see `sealConversationArchiveGeneration`.
 */
export const initializeConversationArchiveGeneration = async (
  options: SealConversationArchiveGenerationOptions,
) => {
  const sealed = await sealConversationArchiveGeneration(options)
  await activateConversationArchiveGeneration({
    root: options.root,
    generationId: sealed.generationId,
    updatedAt: options.createdAt,
  })
  return sealed
}
