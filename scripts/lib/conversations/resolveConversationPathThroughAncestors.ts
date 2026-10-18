import { promises as fs } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

/**
 * The real path of `path`, whether or not it exists yet: the nearest existing
 * ancestor is resolved through its symlinks and the missing rest appended, so
 * a directory about to be created cannot pass for another through an alias.
 */
export const resolveConversationPathThroughAncestors = async (
  path: string,
): Promise<string> => {
  const absolute = resolve(path)
  try {
    return await fs.realpath(absolute)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const parent = dirname(absolute)
    if (parent === absolute) return absolute
    return join(
      await resolveConversationPathThroughAncestors(parent),
      basename(absolute),
    )
  }
}
