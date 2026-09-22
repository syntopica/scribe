import { join } from 'node:path'

/**
 * Where a generation's files live, derived rather than passed around.
 *
 * Every command needs the same four paths and none of them may disagree about
 * the shape, because a segment written one directory away from where the
 * reader looks is a silently lost capture rather than an error.
 */
export const resolveConversationSegmentPaths = (
  root: string,
  generationId?: string,
) => ({
  root,
  reference: join(root, 'current-generation.json'),
  generations: join(root, 'generations'),
  ...(generationId === undefined
    ? {}
    : {
        generation: join(root, 'generations', `g_${generationId}`),
        manifest: join(
          root,
          'generations',
          `g_${generationId}`,
          'generation.json',
        ),
        segments: join(root, 'generations', `g_${generationId}`, 'segments'),
      }),
})
