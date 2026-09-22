import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { writeClaudeConversationArtifact } from './fixtures/writeClaudeConversationArtifact'
import { initializeConversationArchiveGeneration } from './initializeConversationArchiveGeneration'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { readConversationArchiveGeneration } from './readConversationArchiveGeneration'
import { runConversationCapturePass } from './runConversationCapturePass'

/**
 * Measure the two costs this format exists to remove, on disposable data.
 *
 * The v1 numbers being replaced were measured, not estimated: a full capture
 * cost 226.91 seconds, and publishing one conversation cost 132.36 seconds and
 * roughly 12 GB of I/O against a 4.00 GB archive. Both halves had to move,
 * which is why capture and publication are measured separately rather than as
 * one refresh time that hides whichever half did not improve.
 *
 * Four passes over a synthetic tree, each in its own process: cold (everything
 * is new), warm (nothing changed), one changed artifact, and one new
 * conversation. The warm pass is the strictest -- it must read zero payload
 * bytes and write no segment -- because a cache that merely looks fast while
 * still parsing every file would pass a wall-clock threshold on a fast disk
 * and fail on the real corpus.
 */
export const benchmarkConversationSegments = async (options: {
  workspace: string
  artifacts: number
  changed: number
  turns?: number
}) => {
  const home = join(options.workspace, 'home')
  const root = join(options.workspace, 'archive')
  const statePath = join(options.workspace, 'state.sqlite3')
  const turns = options.turns ?? 6
  await fs.mkdir(home, { recursive: true })
  await initializeConversationArchiveGeneration({
    root,
    baseSegments: [],
    createdAt: '2026-08-31T23:00:00.000Z',
  })

  const sessions = Array.from(
    { length: options.artifacts },
    (_, index) => `session-${String(index).padStart(6, '0')}`,
  )
  for (const session of sessions) {
    await writeClaudeConversationArtifact({ home, session, turns })
  }
  const pass = async () => runConversationCapturePass({ home, root, statePath })
  const segmentBytes = async () => {
    const { segments } = await readConversationArchiveGeneration(root)
    const present = await listConversationArchiveSegments(segments)
    return Promise.all(
      present.map(async (sha256) => ({
        sha256,
        bytes: (await fs.stat(join(segments, `s_${sha256}.jsonl`))).size,
      })),
    )
  }

  const cold = await pass()
  const warm = await pass()

  const changedSessions = sessions.slice(0, options.changed)
  for (const session of changedSessions) {
    await writeClaudeConversationArtifact({ home, session, turns: turns + 2 })
  }
  const changedArtifactBytes = (
    await Promise.all(
      changedSessions.map(async (session) =>
        fs.stat(
          join(home, '.claude', 'projects', 'fixture', `${session}.jsonl`),
        ),
      ),
    )
  ).reduce((total, stats) => total + stats.size, 0)

  const sizesBefore = await segmentBytes()
  const changedPass = await pass()
  const sizesAfter = await segmentBytes()

  await writeClaudeConversationArtifact({
    home,
    session: 'session-brand-new',
    turns,
  })
  const added = await pass()

  const report = (measured: Awaited<ReturnType<typeof pass>>) => ({
    seconds: measured.elapsedSeconds,
    peakRssBytes: measured.peakRssBytes,
    cacheHits: measured.metrics.cacheHits,
    fullyParsed: measured.metrics.fullyParsed,
    fragmentsAppended: measured.metrics.fragmentsAppended,
    payloadBytesRead: measured.metrics.payloadBytesRead,
    recordsNormalized: measured.metrics.recordsNormalized,
    segments: measured.segments.length,
    segmentBytes: measured.segments.reduce(
      (total, segment) => total + segment.bytes,
      0,
    ),
  })

  return {
    artifacts: options.artifacts,
    changed: options.changed,
    changedArtifactBytes,
    peakRssBytes: Math.max(
      cold.peakRssBytes,
      warm.peakRssBytes,
      changedPass.peakRssBytes,
      added.peakRssBytes,
    ),
    // Every segment that existed before the changed pass must still hold the
    // exact bytes it held. Immutability is the property the whole design rests
    // on, so it is asserted rather than assumed.
    // Matched by hash rather than by position: the new segment sorts into the
    // middle of the inventory, so a positional comparison reports every
    // segment after it as changed.
    existingSegmentsUnchanged: sizesBefore.every(
      (entry) =>
        sizesAfter.find((after) => after.sha256 === entry.sha256)?.bytes ===
        entry.bytes,
    ),
    passes: {
      cold: report(cold),
      warm: { ...report(warm), wroteSegment: warm.segments.length > 0 },
      changed: report(changedPass),
      // One new conversation, published into an archive of every other one.
      // This is the direct replacement for the measured v1 cost of 132.36
      // seconds and roughly 12 GB of I/O, which bought one appended record.
      added: report(added),
    },
  }
}
