import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { differingConversationArchiveDigests } from './differingConversationArchiveDigests'
import { digestConversationArchiveState } from './digestConversationArchiveState'
import type { ConversationRecoveryDrillStep } from './types/ConversationRecoveryDrillStep'
import type { ConversationRecoveryDrillStepOptions } from './types/ConversationRecoveryDrillStepOptions'

/**
 * Step 2: build the disposable state in `--work`, delete it, rebuild it from
 * the segments alone, and require the rebuilt state's digests to be the
 * baseline's.
 */
export const runRecoveryDrillRebuild = async (
  options: ConversationRecoveryDrillStepOptions,
): Promise<ConversationRecoveryDrillStep> => {
  const statePath = join(options.work, 'state.sqlite3')
  await digestConversationArchiveState({ root: options.root, statePath })
  for (const suffix of ['', '-wal', '-shm', '-journal'])
    await fs.rm(`${statePath}${suffix}`, { force: true })
  const rebuilt = await digestConversationArchiveState({
    root: options.root,
    statePath,
  })
  const differing = differingConversationArchiveDigests(
    options.baseline,
    rebuilt.digests,
  )
  const problems = [
    ...(rebuilt.replayed === 0
      ? ['the rebuild replayed no segment, so nothing was rebuilt']
      : []),
    ...(differing.length === 0
      ? []
      : [`rebuilt state differs from the baseline in ${differing.join(', ')}`]),
  ]
  return {
    step: 'rebuild',
    ok: problems.length === 0,
    problems,
    details: {
      statePath,
      replayed: rebuilt.replayed,
      digests: rebuilt.digests,
    },
  }
}
