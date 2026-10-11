import { resolve } from 'node:path'
import { inventoryConversationSegmentArchive } from '../lib/conversations/inventoryConversationSegmentArchive'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Print what this installation holds: generation, segments, pending deliveries.
 *
 * `--root` and `--state` are required and have no default, so the command
 * cannot reach a live archive or its state by omission: opening a state for
 * another generation discards it. Output is JSON on stdout.
 */
export const main = async () => {
  const requestedRoot = flagValue(process.argv, '--root')
  const requestedState = flagValue(process.argv, '--state')
  if (requestedRoot === undefined || requestedState === undefined) {
    console.error('--root and --state are required')
    process.exitCode = 2
    return
  }
  const result = await inventoryConversationSegmentArchive({
    root: resolve(requestedRoot),
    statePath: resolve(requestedState),
  })
  console.log(JSON.stringify(result, null, 2))
}
