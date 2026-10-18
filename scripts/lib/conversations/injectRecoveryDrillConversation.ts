import { join } from 'node:path'
import { activateConversationArchiveGeneration } from './activateConversationArchiveGeneration'
import { createRecoveryDrillConversation } from './createRecoveryDrillConversation'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { sealConversationRecordsAsGeneration } from './sealConversationRecordsAsGeneration'
import { streamConversationErasureSurvivors } from './streamConversationErasureSurvivors'
import type { RecoveryDrillConversationOptions } from './types/RecoveryDrillConversationOptions'
import { withArchiveWriteLock } from './withArchiveWriteLock'

/**
 * Select a child of the current generation holding every fragment it holds
 * plus the synthetic target, and return its id.
 *
 * Sealed as a new generation rather than captured as a delta, so the original
 * generation is never written: activating it again is then an exact rollback
 * to the drill's baseline, not to a baseline plus the target.
 */
export const injectRecoveryDrillConversation = async (
  options: RecoveryDrillConversationOptions,
) =>
  withArchiveWriteLock(
    join(options.root, 'archive'),
    async () => {
      const { generation, segments } = await readConversationArchiveGeneration(
        options.root,
      )
      const present = await listConversationArchiveSegments(segments)
      const sealed = await sealConversationRecordsAsGeneration({
        root: options.root,
        createdAt: options.createdAt,
        buckets: 32,
        parentGenerationId: generation.generationId,
        records: (async function* () {
          yield* streamConversationErasureSurvivors({
            segmentsDirectory: segments,
            segmentSha256: present,
            generation,
            removing: new Set(),
            kept: new Set(),
            removed: new Set(),
          })
          yield createRecoveryDrillConversation(
            options.marker,
            options.createdAt,
          )
        })(),
      })
      await activateConversationArchiveGeneration({
        root: options.root,
        generationId: sealed.generationId,
        updatedAt: options.createdAt,
      })
      return sealed.generationId
    },
    options.migrationFrozen,
  )
