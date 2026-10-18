import { join, resolve } from 'node:path'
import { applyConversationArchiveErasure } from '../lib/conversations/applyConversationArchiveErasure'
import { readConversationErasurePlanFile } from '../lib/conversations/readConversationErasurePlanFile'
import { recordConversationErasureTarget } from '../lib/conversations/recordConversationErasureTarget'
import { replaceConversationJsonFile } from '../lib/conversations/replaceConversationJsonFile'
import { withArchiveWriteLock } from '../lib/conversations/withArchiveWriteLock'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Seal the generation a reviewed plan describes, record its id in the plan
 * file, and select nothing.
 *
 * Read, apply and the plan's rewrite all run under the archive write lock, so
 * no capture lands mid-rewrite and two applies of one plan cannot both seal: a
 * plan that already names its target has been applied and is refused.
 */
export const conversationsEraseApply = async (argv: string[]) => {
  const requestedRoot = flagValue(argv, '--root')
  const planFile = flagValue(argv, '--plan')
  if (requestedRoot === undefined || planFile === undefined) {
    console.error('--root and --plan are required')
    process.exitCode = 2
    return
  }
  const root = resolve(requestedRoot)
  // The lock capture takes: it freezes captures for the rewrite, and a second
  // apply of the same plan waits here, then finds the target recorded.
  const applied = await withArchiveWriteLock(
    join(root, 'archive'),
    async () => {
      const plan = await readConversationErasurePlanFile(resolve(planFile))
      if (plan.toGenerationId !== undefined) {
        console.error(
          `the plan was already applied: it names generation ${plan.toGenerationId}`,
        )
        process.exitCode = 2
        return undefined
      }
      if (plan.reason === 'redaction') {
        console.error(
          'a redaction plan cannot be applied yet: apply only removes',
        )
        process.exitCode = 2
        return undefined
      }
      const sealed = await applyConversationArchiveErasure({
        root,
        plan,
        createdAt: new Date(
          flagValue(argv, '--now') ?? Date.now(),
        ).toISOString(),
      })
      await replaceConversationJsonFile(
        resolve(planFile),
        recordConversationErasureTarget(plan, sealed.generationId),
      )
      return sealed
    },
  )
  if (applied === undefined) return
  console.log(JSON.stringify({ plan: resolve(planFile), ...applied }, null, 2))
}
