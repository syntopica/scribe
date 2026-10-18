import { resolve } from 'node:path'
import { planConversationArchiveErasureFromRoot } from '../lib/conversations/planConversationArchiveErasureFromRoot'
import { readConversationIdsFile } from '../lib/conversations/readConversationIdsFile'
import { writeNewConversationJsonFile } from '../lib/conversations/writeNewConversationJsonFile'
import { flagValue } from '../lib/machine/cli/flagValue'
import { flagValues } from '../lib/machine/cli/flagValues'

/**
 * Write a reviewable erasure plan for the named conversations to `--output`.
 *
 * Reads the archive and writes nothing into it. The plan file is created, never
 * replaced, so an existing plan -- possibly already applied -- cannot be
 * overwritten by a second run. Ids that match nothing are reported rather than
 * silently dropped: a typo would otherwise plan an empty erasure. A redaction
 * plan names only the fragments the current redactor would change; requested
 * conversations it finds clean are reported as `unchangedConversationIds`, and
 * a request with nothing to redact writes no plan.
 */
export const conversationsErasePlan = async (argv: string[]) => {
  const requestedRoot = flagValue(argv, '--root')
  const output = flagValue(argv, '--output')
  const idsFile = flagValue(argv, '--ids-file')
  const reason = flagValue(argv, '--reason') ?? 'erasure'
  if (requestedRoot === undefined || output === undefined) {
    console.error('--root and --output are required')
    process.exitCode = 2
    return
  }
  if (reason !== 'erasure' && reason !== 'redaction' && reason !== 'pack') {
    console.error('--reason must be erasure, redaction or pack')
    process.exitCode = 2
    return
  }
  const requested = [
    ...flagValues(argv, '--conversation'),
    ...(idsFile === undefined
      ? []
      : await readConversationIdsFile(resolve(idsFile))),
  ]
  if (requested.length === 0) {
    console.error('name at least one --conversation <id> or an --ids-file')
    process.exitCode = 2
    return
  }
  const matched = new Set<string>()
  const unredactable = new Set<string>()
  const plan = await planConversationArchiveErasureFromRoot({
    root: resolve(requestedRoot),
    createdAt: new Date(flagValue(argv, '--now') ?? Date.now()).toISOString(),
    reason,
    removeConversationIds: requested,
    matchedConversationIds: matched,
    unredactableConversationIds: unredactable,
  })
  const planned = new Set(plan.conversationIds)
  const report = {
    fromGenerationId: plan.fromGenerationId,
    reason: plan.reason,
    conversationIds: plan.conversationIds,
    fragmentsRemoved: plan.conversations.reduce(
      (total, entry) => total + entry.removedFragmentSha256.length,
      0,
    ),
    unmatchedConversationIds: [...new Set(requested)].filter(
      (id) => !matched.has(id),
    ),
    ...(reason === 'redaction'
      ? {
          unchangedConversationIds: [...matched].filter(
            (id) => !planned.has(id),
          ),
          unredactableConversationIds: [...unredactable].toSorted(
            (left, right) => left.localeCompare(right),
          ),
        }
      : {}),
  }
  if (reason === 'redaction' && plan.conversations.length === 0) {
    console.log(JSON.stringify(report, null, 2))
    console.error(
      `nothing to redact: the current redactor changes no fragment of ${String(matched.size)} matched conversation(s); no plan written`,
    )
    process.exitCode = 1
    return
  }
  await writeNewConversationJsonFile(resolve(output), plan)
  console.log(JSON.stringify({ plan: resolve(output), ...report }, null, 2))
}
