import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { deriveConversationArchiveGenerationId } from './deriveConversationArchiveGenerationId'
import { fsyncConversationDirectory } from './fsyncConversationDirectory'
import { publishConversationSegment } from './publishConversationSegment'
import { resolveConversationSegmentPaths } from './resolveConversationSegmentPaths'
import type { ConversationArchiveGeneration } from './types/ConversationArchiveGeneration'
import type { ConversationArchiveGenerationReference } from './types/ConversationArchiveGenerationReference'

/**
 * Seal a set of base segments into a generation and point the archive at it.
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
 * corpus this migrates is four gigabytes; the caller streams them and only one
 * segment is in memory at a time.
 */
export const initializeConversationArchiveGeneration = async (options: {
  root: string
  baseSegments: AsyncIterable<string> | Iterable<string>
  createdAt: string
}) => {
  const base = resolveConversationSegmentPaths(options.root)
  const staging = join(base.generations, `.staging-${randomUUID()}`)
  const stagedSegments = join(staging, 'segments')
  await fs.mkdir(stagedSegments, { recursive: true, mode: 0o700 })

  const hashes: string[] = []
  try {
    for await (const text of options.baseSegments) {
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

    const reference: ConversationArchiveGenerationReference = {
      kind: 'rocket-agents-conversation-generation-reference',
      schemaVersion: 2,
      generationId,
      updatedAt: options.createdAt,
    }
    const temporary = `${base.reference}.tmp-${randomUUID()}`
    await fs.writeFile(temporary, `${JSON.stringify(reference)}\n`, {
      mode: 0o600,
    })
    // Replacing rename is used for this reference and nothing else. Immutable
    // objects are published by link, which cannot overwrite; which generation
    // is current is the one thing that has to be able to move.
    await fs.rename(temporary, base.reference)
    await fsyncConversationDirectory(base.root)
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
