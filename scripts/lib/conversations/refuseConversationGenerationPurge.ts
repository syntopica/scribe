import type { ConversationArchiveGeneration } from './types/ConversationArchiveGeneration'

/**
 * Why a generation must stay on disk, or `undefined` when it may go.
 *
 * The selected generation is what every writer and reader is on. The one it
 * was rewritten from is the rollback: activating it again is how a bad erasure
 * is undone, so it goes only when the caller says the rollback is given up.
 */
export const refuseConversationGenerationPurge = (
  generationId: string,
  selected: ConversationArchiveGeneration,
  includeRollback: boolean,
) => {
  if (generationId === selected.generationId)
    return 'it is the selected generation'
  if (generationId === selected.parentGenerationId && !includeRollback)
    return 'it is the rollback target of the selected generation; pass --include-rollback to give the rollback up'
  return undefined
}
