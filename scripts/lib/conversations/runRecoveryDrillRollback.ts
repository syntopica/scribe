import { activateConversationArchiveGenerationLocked } from './activateConversationArchiveGenerationLocked'
import { differingConversationArchiveDigests } from './differingConversationArchiveDigests'
import { readConversationArchiveDigests } from './readConversationArchiveDigests'
import { recoveryDrillVerifyDirectory } from './recoveryDrillVerifyDirectory'
import type { ConversationRecoveryDrillStep } from './types/ConversationRecoveryDrillStep'
import type { ConversationRecoveryDrillStepOptions } from './types/ConversationRecoveryDrillStepOptions'

/**
 * Step 5: activate the baseline generation again, the rollback of an erasure,
 * and require every digest to be the baseline's.
 */
export const runRecoveryDrillRollback = async (
  options: ConversationRecoveryDrillStepOptions,
): Promise<ConversationRecoveryDrillStep> => {
  await activateConversationArchiveGenerationLocked(
    options.root,
    options.baseline.generationId,
    options.migrationFrozen,
  )
  const restored = await readConversationArchiveDigests(
    options.root,
    recoveryDrillVerifyDirectory(options.work),
  )
  const differing = differingConversationArchiveDigests(
    options.baseline,
    restored.digests,
  )
  const problems = [
    ...restored.problems,
    ...(differing.length === 0
      ? []
      : [`the rolled-back archive differs in ${differing.join(', ')}`]),
  ]
  return {
    step: 'rollback',
    ok: problems.length === 0,
    problems,
    details: { digests: restored.digests },
  }
}
