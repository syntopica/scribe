import { resolve } from 'node:path'
import { conversationPathExists } from '../lib/conversations/conversationPathExists'
import { isConversationDigest } from '../lib/conversations/isConversationDigest'
import { receiveConversationSegments } from '../lib/conversations/receiveConversationSegments'
import { resolveConversationSegmentPaths } from '../lib/conversations/resolveConversationSegmentPaths'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * `scribe segments-receive --root <root> --from <staging>
 * --expect-generation <id>`: link the segments a peer staged into the active
 * generation, each through the generation barrier.
 *
 * Every flag is required and has no default, so the command cannot reach a
 * live archive by omission, nor skip the generation check. `--expect-generation` is the
 * sender's inventory `generationId`; when it differs from this archive's the
 * whole exchange is refused before any staged file is read. Prints the JSON
 * report; exits 1 when the exchange or any staged file was refused, and every
 * refused file stays in staging.
 */
export const main = async () => {
  const requestedRoot = flagValue(process.argv, '--root')
  const from = flagValue(process.argv, '--from')
  const expected = flagValue(process.argv, '--expect-generation')
  if (
    requestedRoot === undefined ||
    from === undefined ||
    expected === undefined
  ) {
    console.error('--root, --from and --expect-generation are required')
    process.exitCode = 2
    return
  }
  if (!isConversationDigest(expected)) {
    console.error(
      '--expect-generation must be a 64-character hex generation id',
    )
    process.exitCode = 2
    return
  }
  const root = resolve(requestedRoot)
  if (
    !(await conversationPathExists(
      resolveConversationSegmentPaths(root).reference,
    ))
  ) {
    console.error(
      `${root} holds no active generation; seed one with segments-seed-generation and activate it`,
    )
    process.exitCode = 2
    return
  }
  const report = await receiveConversationSegments({
    root,
    from: resolve(from),
    expectedGenerationId: expected,
  })
  console.log(JSON.stringify(report, null, 2))
  if (report.refusedExchange !== undefined) {
    console.error(report.refusedExchange)
    process.exitCode = 1
  } else if (report.refused.length > 0) {
    console.error(
      `${String(report.refused.length)} staged file(s) refused and left in ${resolve(from)}`,
    )
    process.exitCode = 1
  }
}
