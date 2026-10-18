import { readConversationArchiveDigests } from './readConversationArchiveDigests'
import { recoveryDrillVerifyDirectory } from './recoveryDrillVerifyDirectory'
import { runRecoveryDrillErasure } from './runRecoveryDrillErasure'
import { runRecoveryDrillRebuild } from './runRecoveryDrillRebuild'
import { runRecoveryDrillRollback } from './runRecoveryDrillRollback'
import { runRecoveryDrillStalePeer } from './runRecoveryDrillStalePeer'
import { runRecoveryDrillStep } from './runRecoveryDrillStep'
import type { ConversationArchiveDigests } from './types/ConversationArchiveDigests'
import type { ConversationRecoveryDrillOptions } from './types/ConversationRecoveryDrillOptions'
import type { ConversationRecoveryDrillReport } from './types/ConversationRecoveryDrillReport'
import type { ConversationRecoveryDrillStep } from './types/ConversationRecoveryDrillStep'

/**
 * Rehearse recovery on a disposable archive copy: baseline, rebuild, and when
 * asked erasure and a stale peer, then rollback to the baseline generation.
 *
 * Steps run in order and the drill stops at the first that fails, since every
 * later step assumes the earlier ones held. The caller has already refused any
 * root that is not a disposable copy (`assertConversationRecoveryDrillPaths`).
 */
export const runConversationRecoveryDrill = async (
  options: ConversationRecoveryDrillOptions,
): Promise<ConversationRecoveryDrillReport> => {
  const steps: ConversationRecoveryDrillStep[] = []
  let baseline: ConversationArchiveDigests | undefined
  steps.push(
    await runRecoveryDrillStep('baseline', async () => {
      const read = await readConversationArchiveDigests(
        options.root,
        recoveryDrillVerifyDirectory(options.work),
      )
      baseline = read.digests
      return {
        step: 'baseline',
        ok: read.problems.length === 0,
        problems: read.problems,
        details: { digests: read.digests },
      }
    }),
  )
  const later = [
    ['rebuild', runRecoveryDrillRebuild],
    ...(options.exerciseErasure
      ? [['erasure', runRecoveryDrillErasure] as const]
      : []),
    ...(options.exerciseStalePeer
      ? [['stale-peer', runRecoveryDrillStalePeer] as const]
      : []),
    ['rollback', runRecoveryDrillRollback],
  ] as const
  for (const [name, run] of later) {
    if (baseline === undefined || steps.some((step) => !step.ok)) break
    const stepOptions = { ...options, baseline }
    steps.push(await runRecoveryDrillStep(name, async () => run(stepOptions)))
  }
  return {
    ok: steps.every((step) => step.ok) && steps.length === later.length + 1,
    root: options.root,
    work: options.work,
    steps,
  }
}
