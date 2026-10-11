import { resolve } from 'node:path'
import { acknowledgeConversationSlice } from '../lib/conversations/acknowledgeConversationSlice'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Clear the pending deliveries an ingested slice satisfied; newer captures stay.
 *
 * `--root` and `--state` are required and have no default, so the command
 * cannot reach a live archive or its state by omission: opening a state for
 * another generation discards it. Output is JSON on stdout.
 */
export const main = async () => {
  const requestedRoot = flagValue(process.argv, '--root')
  const requestedState = flagValue(process.argv, '--state')
  const slice = flagValue(process.argv, '--slice')
  if (
    requestedRoot === undefined ||
    requestedState === undefined ||
    slice === undefined
  ) {
    console.error('--root, --state and --slice are required')
    process.exitCode = 2
    return
  }
  const result = await acknowledgeConversationSlice({
    root: resolve(requestedRoot),
    statePath: resolve(requestedState),
    slice: resolve(slice),
  })
  console.log(JSON.stringify(result, null, 2))
}
