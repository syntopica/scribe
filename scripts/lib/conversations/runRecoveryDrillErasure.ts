import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { activateConversationArchiveGenerationLocked } from './activateConversationArchiveGenerationLocked'
import { applyConversationArchiveErasure } from './applyConversationArchiveErasure'
import { conversationExportContains } from './conversationExportContains'
import { differingConversationArchiveDigests } from './differingConversationArchiveDigests'
import { exportMaterializedConversationArchive } from './exportMaterializedConversationArchive'
import { injectRecoveryDrillConversation } from './injectRecoveryDrillConversation'
import { planConversationArchiveErasureFromRoot } from './planConversationArchiveErasureFromRoot'
import { readConversationArchiveDigests } from './readConversationArchiveDigests'
import { recordConversationErasureTarget } from './recordConversationErasureTarget'
import { recoveryDrillVerifyDirectory } from './recoveryDrillVerifyDirectory'
import type { ConversationRecoveryDrillStep } from './types/ConversationRecoveryDrillStep'
import type { ConversationRecoveryDrillStepOptions } from './types/ConversationRecoveryDrillStepOptions'
import { verifyConversationArchiveErasure } from './verifyConversationArchiveErasure'
import { withArchiveWriteLock } from './withArchiveWriteLock'
import { writeNewConversationJsonFile } from './writeNewConversationJsonFile'

/**
 * Step 3: inject a synthetic conversation with a unique marker, then plan,
 * apply, verify and activate its erasure. The marker must be in the
 * materialized export before and absent after, and every other conversation
 * must come out as the baseline had it: the erased generation's conversation,
 * event and materialized digests equal the baseline's.
 */
export const runRecoveryDrillErasure = async (
  options: ConversationRecoveryDrillStepOptions,
): Promise<ConversationRecoveryDrillStep> => {
  const { root, work, migrationFrozen } = options
  const marker = `scribe-recovery-drill-${randomUUID()}`
  const createdAt = new Date().toISOString()
  const statePath = join(work, 'state.sqlite3')
  const problems: string[] = []

  const injectedGenerationId = await injectRecoveryDrillConversation({
    root,
    marker,
    createdAt,
    migrationFrozen,
  })
  const before = join(work, 'materialized-before-erasure.jsonl')
  await exportMaterializedConversationArchive({
    root,
    statePath,
    output: before,
    now: new Date(),
  })
  if (!(await conversationExportContains(before, marker)))
    problems.push(
      'the injected marker is not in the export before erasure, so its absence afterwards proves nothing',
    )

  const plan = await planConversationArchiveErasureFromRoot({
    root,
    createdAt,
    reason: 'erasure',
    removeConversationIds: [marker],
  })
  if (plan.conversationIds.join('\n') !== marker)
    problems.push(
      `the plan names ${JSON.stringify(plan.conversationIds)}, not only the marker`,
    )
  const applied = await withArchiveWriteLock(
    join(root, 'archive'),
    async () => applyConversationArchiveErasure({ root, plan, createdAt }),
    migrationFrozen,
  )
  const planFile = join(work, 'erasure-plan.json')
  await writeNewConversationJsonFile(
    planFile,
    recordConversationErasureTarget(plan, applied.generationId),
  )
  const verified = await verifyConversationArchiveErasure({
    root,
    plan,
    generationId: applied.generationId,
  })
  if (!verified.ok)
    problems.push(
      `erase verify failed: ${JSON.stringify({
        removedPresent: verified.removedPresent,
        keptMissing: verified.keptMissing,
        unexpected: verified.unexpected,
        problems: verified.problems,
      })}`,
    )
  await activateConversationArchiveGenerationLocked(
    root,
    applied.generationId,
    migrationFrozen,
  )

  const after = join(work, 'materialized-after-erasure.jsonl')
  await exportMaterializedConversationArchive({
    root,
    statePath,
    output: after,
    now: new Date(),
  })
  if (await conversationExportContains(after, marker))
    problems.push('the marker is still in the export after erasure')
  const erased = await readConversationArchiveDigests(
    root,
    recoveryDrillVerifyDirectory(work),
  )
  problems.push(...erased.problems)
  if (erased.digests.generationId === options.baseline.generationId)
    problems.push('the erasure landed on the baseline generation itself')
  const differing = differingConversationArchiveDigests(
    options.baseline,
    erased.digests,
    ['conversationIds', 'eventSet', 'materializedState'],
  )
  if (differing.length > 0)
    problems.push(
      `conversations other than the marker changed: ${differing.join(', ')}`,
    )
  return {
    step: 'erasure',
    ok: problems.length === 0,
    problems,
    details: {
      marker,
      injectedGenerationId,
      generationId: applied.generationId,
      fragmentsRemoved: applied.fragmentsRemoved,
      plan: planFile,
      digests: erased.digests,
    },
  }
}
