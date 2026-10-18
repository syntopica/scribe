import { join } from 'node:path'
import { activateConversationArchiveGeneration } from './activateConversationArchiveGeneration'
import { withArchiveWriteLock } from './withArchiveWriteLock'

/** `scribe erase activate` as a library call: select a held generation under the write lock. */
export const activateConversationArchiveGenerationLocked = async (
  root: string,
  generationId: string,
  migrationFrozen: boolean,
) =>
  withArchiveWriteLock(
    join(root, 'archive'),
    async () =>
      activateConversationArchiveGeneration({
        root,
        generationId,
        updatedAt: new Date().toISOString(),
      }),
    migrationFrozen,
  )
