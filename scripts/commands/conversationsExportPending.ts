import { resolve } from 'node:path'
import { exportPendingConversationSlice } from '../lib/conversations/exportPendingConversationSlice'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Write the conversations Atrium has not been handed yet as an export slice.
 *
 * `--root` and `--state` are required and have no default, so the command
 * cannot reach a live archive or its state by omission: opening a state for
 * another generation discards it. Output is JSON on stdout.
 */
export const main = async () => {
  const requestedRoot = flagValue(process.argv, '--root')
  const requestedState = flagValue(process.argv, '--state')
  const output = flagValue(process.argv, '--output')
  if (
    requestedRoot === undefined ||
    requestedState === undefined ||
    output === undefined
  ) {
    console.error('--root, --state and --output are required')
    process.exitCode = 2
    return
  }
  const result = await exportPendingConversationSlice({
    root: resolve(requestedRoot),
    statePath: resolve(requestedState),
    output: resolve(output),
    now: new Date(flagValue(process.argv, '--now') ?? Date.now()),
  })
  console.log(JSON.stringify(result, null, 2))
}
