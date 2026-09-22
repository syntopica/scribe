import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { conversationPathExists } from '../lib/conversations/conversationPathExists'
import { defaultConversationStatePath } from '../lib/conversations/defaultConversationStatePath'
import { initializeConversationArchiveGeneration } from '../lib/conversations/initializeConversationArchiveGeneration'
import { parseConversationSources } from '../lib/conversations/parseConversationSources'
import { publishConversationCapture } from '../lib/conversations/publishConversationCapture'
import { resolveConversationSegmentPaths } from '../lib/conversations/resolveConversationSegmentPaths'
import { withPeakRssSampling } from '../lib/conversations/withPeakRssSampling'
import { flagValue } from '../lib/machine/cli/flagValue'
import { flagValues } from '../lib/machine/cli/flagValues'

/**
 * The scheduled path: capture what changed, publish at most one segment.
 *
 * This replaces an hourly full export. It refuses to run against an archive
 * root that has no generation unless `--init` is passed, because seeding an
 * empty generation next to a real archive that failed to be read would look
 * like success and quietly start a second, empty history.
 */
export const main = async () => {
  const requestedRoot = flagValue(process.argv, '--root')
  if (requestedRoot === undefined) {
    console.error('--root is required')
    process.exitCode = 2
    return
  }

  const selection = parseConversationSources(
    flagValues(process.argv, '--source'),
  )
  if (selection.errors.length > 0) {
    console.error(selection.errors.join('\n'))
    process.exitCode = 2
    return
  }

  const home = flagValue(process.argv, '--home') ?? homedir()
  const root = resolve(requestedRoot)
  const statePath = resolve(
    flagValue(process.argv, '--state') ?? defaultConversationStatePath(home),
  )
  const createdAt = flagValue(process.argv, '--now') ?? new Date().toISOString()

  const reference = resolveConversationSegmentPaths(root).reference
  if (!(await conversationPathExists(reference))) {
    if (!process.argv.includes('--init')) {
      console.error(
        `${root} holds no generation; migrate a v1 archive into it or pass --init`,
      )
      process.exitCode = 2
      return
    }
    await initializeConversationArchiveGeneration({
      root,
      baseSegments: [],
      createdAt,
    })
  }

  await fs.mkdir(dirname(statePath), { recursive: true, mode: 0o700 })
  const measured = await withPeakRssSampling(async () =>
    publishConversationCapture({
      home,
      root,
      statePath,
      ...(selection.sources === undefined
        ? {}
        : { sources: selection.sources }),
      createdAt,
    }),
  )
  console.log(
    JSON.stringify(
      {
        ...measured.result,
        elapsedSeconds: measured.elapsedSeconds,
        peakRssBytes: measured.peakRssBytes,
      },
      null,
      2,
    ),
  )
  if (!measured.result.metrics.ok) process.exitCode = 1
}
