import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { deriveConversationArchiveGenerationId } from './deriveConversationArchiveGenerationId'
import { fsyncConversationDirectory } from './fsyncConversationDirectory'
import { publishConversationSegment } from './publishConversationSegment'
import { resolveConversationSegmentPaths } from './resolveConversationSegmentPaths'
import { streamConversationSegmentTexts } from './streamConversationSegmentTexts'
import type { ConversationArchiveGeneration } from './types/ConversationArchiveGeneration'
import type { SealConversationArchiveGenerationOptions } from './types/SealConversationArchiveGenerationOptions'

/**
 * Seal a set of base segments into a generation without selecting it.
 *
 * Sealing and selecting are separate on purpose. An erasure writes its new
 * generation on every archive holder first and switches the reference only
 * once all of them hold and have verified it; a reference switched on one host
 * before the others hold the bytes would leave that host refusing every peer.
 *
 * The id comes out of the base segments' hashes, so this is deterministic: two
 * hosts that apply the same reviewed erasure to the same corpus land on the
 * same generation id without exchanging a message, and a host cannot announce
 * a generation it does not hold the bytes for.
 *
 * That derivation is also why the segments are published into a staging
 * directory first: the directory is named after a hash of everything inside
 * it, which is not known until the last segment is written. The staging
 * directory is renamed into place afterwards, so a reader never sees a
 * generation that is still filling up.
 *
 * Base segments arrive as an async iterable rather than an array because the
 * corpus this migrates is several gigabytes; the caller streams them and only
 * one segment is in memory at a time.
 */
export const sealConversationArchiveGeneration = async (
  options: SealConversationArchiveGenerationOptions,
) => {
  const base = resolveConversationSegmentPaths(options.root)
  const staging = join(base.generations, `.staging-${randomUUID()}`)
  const stagedSegments = join(staging, 'segments')
  await fs.mkdir(stagedSegments, { recursive: true, mode: 0o700 })

  try {
    const hashes: string[] = []
    for await (const text of streamConversationSegmentTexts(
      options.baseSegments,
    )) {
      const result = await publishConversationSegment({
        segmentsDirectory: stagedSegments,
        text,
      })
      hashes.push(result.sha256)
    }

    const generationId = deriveConversationArchiveGenerationId(hashes)
    const paths = resolveConversationSegmentPaths(options.root, generationId)
    if (paths.generation === undefined || paths.manifest === undefined) {
      throw new Error('generation paths were not resolved')
    }
    const generation: ConversationArchiveGeneration = {
      kind: 'rocket-agents-conversation-generation',
      schemaVersion: 2,
      generationId,
      createdAt: options.createdAt,
      baseSegmentSha256: hashes.toSorted((left, right) =>
        left.localeCompare(right),
      ),
      ...(options.parentGenerationId === undefined
        ? {}
        : { parentGenerationId: options.parentGenerationId }),
    }
    await fs.writeFile(
      join(staging, 'generation.json'),
      `${JSON.stringify(generation)}\n`,
      { mode: 0o600 },
    )

    // A generation directory is immutable once named, so a rerun that produced
    // identical bytes finds it already there and keeps the copy on disk rather
    // than replacing a directory another reader may be walking.
    const already = await fs.stat(paths.generation).catch(() => undefined)
    if (already === undefined) await fs.rename(staging, paths.generation)
    else await fs.rm(staging, { recursive: true, force: true })
    await fsyncConversationDirectory(base.generations)
    return {
      generationId,
      generation,
      paths,
      segments: generation.baseSegmentSha256,
    }
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true })
    throw error
  }
}
