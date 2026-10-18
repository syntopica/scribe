import { resolve } from 'node:path'
import { readConversationErasurePlanFile } from '../lib/conversations/readConversationErasurePlanFile'
import { verifyConversationArchiveErasure } from '../lib/conversations/verifyConversationArchiveErasure'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Check the generation an applied plan names is the old one minus exactly the
 * planned fragments (plus, for a redaction, exactly their re-redacted
 * replacements). Prints the report; exits 1 on any mismatch.
 */
export const conversationsEraseVerify = async (argv: string[]) => {
  const requestedRoot = flagValue(argv, '--root')
  const planFile = flagValue(argv, '--plan')
  if (requestedRoot === undefined || planFile === undefined) {
    console.error('--root and --plan are required')
    process.exitCode = 2
    return
  }
  const plan = await readConversationErasurePlanFile(resolve(planFile))
  if (plan.toGenerationId === undefined) {
    console.error('the plan has not been applied: it names no toGenerationId')
    process.exitCode = 2
    return
  }
  if (plan.conversations.length === 0) {
    console.error('the plan removes nothing, so there is no erasure to verify')
    process.exitCode = 1
    return
  }
  const report = await verifyConversationArchiveErasure({
    root: resolve(requestedRoot),
    plan,
    generationId: plan.toGenerationId,
  })
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}
