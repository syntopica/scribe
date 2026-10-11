import { listConversationArchiveSegments } from './listConversationArchiveSegments'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'

/**
 * Every fragment hash one generation holds, read through its barrier.
 *
 * Each segment is read as the generation would read it, so a segment from
 * another generation, a base segment the manifest does not name, or a missing
 * base segment becomes a named problem rather than a silently counted or
 * silently absent fragment.
 */
export const readConversationGenerationFragmentHashes = async (
  root: string,
  generationId: string,
) => {
  const { generation, segments } =
    await readConversationArchiveGenerationManifest(root, generationId)
  const present = await listConversationArchiveSegments(segments)
  const problems = generation.baseSegmentSha256
    .filter((sha256) => !present.includes(sha256))
    .map(
      (sha256) =>
        `generation ${generationId}: base segment ${sha256} is missing`,
    )
  const fragments = new Set<string>()
  for (const sha256 of present) {
    try {
      const segment = await readConversationArchiveSegment({
        segmentsDirectory: segments,
        sha256,
        generation,
      })
      for (const entry of segment.entries) fragments.add(entry.fragmentSha256)
    } catch (error) {
      problems.push(
        `generation ${generationId}: segment ${sha256}: ${
          error instanceof Error ? error.message : 'unreadable'
        }`,
      )
    }
  }
  return { fragments, problems }
}
