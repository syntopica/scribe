import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/**
 * The first symbolic link anywhere under `directory`, or undefined. Every
 * entry is checked with lstat semantics, so a link is reported, never followed.
 */
export const findConversationSymlinkWithin = async (
  directory: string,
): Promise<string | undefined> => {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) return path
    if (entry.isDirectory()) {
      const found = await findConversationSymlinkWithin(path)
      if (found !== undefined) return found
    }
  }
  return undefined
}
