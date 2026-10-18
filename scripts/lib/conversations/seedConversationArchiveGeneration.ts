import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { conversationPathExists } from './conversationPathExists'
import { deriveConversationArchiveGenerationId } from './deriveConversationArchiveGenerationId'
import { fsyncConversationDirectory } from './fsyncConversationDirectory'
import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { publishConversationSegment } from './publishConversationSegment'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import { resolveConversationSegmentPaths } from './resolveConversationSegmentPaths'
import type { SeedConversationArchiveGenerationOptions } from './types/SeedConversationArchiveGenerationOptions'
import { verifyPresentConversationSegment } from './verifyPresentConversationSegment'
import { withArchiveWriteLock } from './withArchiveWriteLock'
import { writeConversationFileDurably } from './writeConversationFileDurably'

/**
 * Copy a whole generation a peer staged into this archive, and select nothing.
 *
 * The only way two installations on different generations converge: deltas
 * are never exchanged across generations, so the stale one takes the whole
 * generation -- manifest, base and deltas -- and a person then activates it
 * (`scribe erase activate`), which is also the rollback.
 *
 * The staging directory has the archive's own layout,
 * `<from>/generations/g_<id>/{generation.json,segments/}`, so the manifest is
 * read with the same checks as a local one. On top of those, the id must be the
 * one the manifest's base segments derive, every base segment must be staged,
 * and every staged segment must pass the generation barrier; any failure
 * refuses the seed. A new generation is assembled beside the others and renamed
 * into place, as sealing does, so a stopped seed leaves no generation behind;
 * into one already held, validated segments are published one by one, so a
 * rerun completes it. The staging directory is left as it was.
 */
export const seedConversationArchiveGeneration = async (
  options: SeedConversationArchiveGenerationOptions,
) =>
  withArchiveWriteLock(
    join(options.root, 'archive'),
    async () => {
      const staged = await readConversationArchiveGenerationManifest(
        options.from,
        options.generationId,
      )
      const { generation } = staged
      if (
        deriveConversationArchiveGenerationId(generation.baseSegmentSha256) !==
        options.generationId
      ) {
        throw new Error(
          `generation ${options.generationId} is not the one its base segments derive`,
        )
      }
      const names = await listConversationArchiveSegments(staged.segments)
      const missing = generation.baseSegmentSha256.filter(
        (sha256) => !names.includes(sha256),
      )
      if (missing.length > 0) {
        throw new Error(`base segments are not staged: ${missing.join(', ')}`)
      }

      const paths = resolveConversationSegmentPaths(
        options.root,
        options.generationId,
      )
      if (paths.generation === undefined || paths.segments === undefined) {
        throw new Error('generation paths were not resolved')
      }
      const held = await conversationPathExists(paths.generation)
      if (held) {
        await readConversationArchiveGenerationManifest(
          options.root,
          options.generationId,
        )
      }
      const assembly = join(paths.generations, `.staging-${randomUUID()}`)
      const target = held ? paths.segments : join(assembly, 'segments')
      try {
        await fs.mkdir(target, { recursive: true, mode: 0o700 })
        let published = 0
        for (const sha256 of names) {
          const segment = await readConversationArchiveSegment({
            segmentsDirectory: staged.segments,
            sha256,
            generation,
          })
          const result = await publishConversationSegment({
            segmentsDirectory: target,
            text: segment.text,
          })
          if (result.published) published++
          else if (
            !(await verifyPresentConversationSegment(result.path, sha256))
          ) {
            throw new Error(
              `destination corrupt: ${result.path} does not hash to its name; nothing was replaced`,
            )
          }
        }
        if (!held) {
          await writeConversationFileDurably(
            join(assembly, 'generation.json'),
            `${JSON.stringify(generation)}\n`,
          )
          await fsyncConversationDirectory(assembly)
          await fs.rename(assembly, paths.generation)
          await fsyncConversationDirectory(paths.generations)
        }
        return {
          generationId: options.generationId,
          created: !held,
          segments: names.length,
          published,
          activated: false,
        }
      } finally {
        await fs.rm(assembly, { recursive: true, force: true })
      }
    },
    options.migrationFrozen,
  )
