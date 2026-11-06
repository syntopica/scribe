import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/** The bytes of every regular file under `directory`, links not followed. */
export const measureDirectoryBytes = async (
  directory: string,
): Promise<number> => {
  let bytes = 0
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) bytes += await measureDirectoryBytes(path)
    else if (entry.isFile()) bytes += (await fs.lstat(path)).size
  }
  return bytes
}
