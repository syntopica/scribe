import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { isConversationPathWithin } from './isConversationPathWithin'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { receiveStagedConversationSegment } from './receiveStagedConversationSegment'
import type { ConversationSegmentReceiveReport } from './types/ConversationSegmentReceiveReport'
import type { ReceiveConversationSegmentsOptions } from './types/ReceiveConversationSegmentsOptions'
import { withArchiveWriteLock } from './withArchiveWriteLock'

/**
 * Link the segments a peer staged into this archive's active generation.
 *
 * Transport is a copy of missing names into a staging directory; this is the
 * step that decides what of it may enter. It runs under the archive write lock
 * capture takes, so the generation cannot be switched or appended to while the
 * staged files are judged against it. When the sender's inventory names
 * another generation (`expectedGenerationId`), nothing is read at all: two
 * installations on different generations do not exchange deltas, and only an
 * explicit seed of the whole generation brings them together.
 *
 * Nothing touches the state: the next command that opens it replays the new
 * segments and marks their conversations pending for Atrium.
 */
export const receiveConversationSegments = async (
  options: ReceiveConversationSegmentsOptions,
) => {
  // Receive deletes what it has linked from staging; staging inside the root
  // (its own segments directory, by any alias) would delete the archive.
  if (await isConversationPathWithin(options.from, options.root)) {
    throw new Error(
      `the staging directory ${options.from} is inside the archive root ${options.root}`,
    )
  }
  return withArchiveWriteLock(join(options.root, 'archive'), async () => {
    const { generation, segments } = await readConversationArchiveGeneration(
      options.root,
    )
    const report: ConversationSegmentReceiveReport = {
      generationId: generation.generationId,
      received: [],
      alreadyPresent: [],
      refused: [],
      ignored: [],
    }
    if (options.expectedGenerationId !== generation.generationId) {
      return {
        ...report,
        expectedGenerationId: options.expectedGenerationId,
        refusedExchange: `the sender is on generation ${options.expectedGenerationId}, this archive on ${generation.generationId}; seed the generation instead`,
      }
    }
    const names = (await fs.readdir(options.from)).toSorted((left, right) =>
      left.localeCompare(right),
    )
    for (const name of names) {
      if (name.startsWith('.')) {
        report.ignored.push(name)
        continue
      }
      const result = await receiveStagedConversationSegment({
        stagingDirectory: options.from,
        name,
        segmentsDirectory: segments,
        generation,
      })
      if (result.outcome === 'refused') {
        report.refused.push({ name, reason: result.reason })
      } else {
        report[result.outcome].push(result.sha256)
      }
    }
    return report
  })
}
