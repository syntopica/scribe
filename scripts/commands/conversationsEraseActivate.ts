import { resolve } from 'node:path'
import { activateConversationArchiveGeneration } from '../lib/conversations/activateConversationArchiveGeneration'
import { isConversationDigest } from '../lib/conversations/isConversationDigest'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Select the generation `--generation` names. There is no implicit "latest":
 * the id is typed or pasted from a verified plan, and the previous id run
 * through this same step is the rollback.
 */
export const conversationsEraseActivate = async (argv: string[]) => {
  const requestedRoot = flagValue(argv, '--root')
  const generationId = flagValue(argv, '--generation')
  if (requestedRoot === undefined || generationId === undefined) {
    console.error('--root and --generation are required')
    process.exitCode = 2
    return
  }
  if (!isConversationDigest(generationId)) {
    console.error('--generation must be a 64-character hex generation id')
    process.exitCode = 2
    return
  }
  const reference = await activateConversationArchiveGeneration({
    root: resolve(requestedRoot),
    generationId,
    updatedAt: new Date(flagValue(argv, '--now') ?? Date.now()).toISOString(),
  })
  console.log(JSON.stringify(reference, null, 2))
}
