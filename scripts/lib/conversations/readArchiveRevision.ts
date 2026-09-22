import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

/**
 * Identify the archive currently on disk, so a writer can prove it is
 * replacing the same revision it read.
 *
 * The manifest's own content hash is the identity: mtime and size can repeat,
 * and an inode number does not survive the temp-file-and-rename the writer
 * uses. Returns undefined when the archive does not exist yet, which is a
 * legitimate starting state rather than a missing revision.
 */
export const readArchiveRevision = async (
  archive: string,
): Promise<string | undefined> => {
  let stream
  try {
    stream = createReadStream(archive, { encoding: 'utf8' })
  } catch {
    return undefined
  }
  const reader = createInterface({ input: stream, crlfDelay: Infinity })
  try {
    for await (const line of reader) {
      if (line.trim() === '') continue
      const manifest = JSON.parse(line) as { contentSha256?: unknown }
      return typeof manifest.contentSha256 === 'string'
        ? manifest.contentSha256
        : ''
    }
    return ''
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  } finally {
    reader.close()
    stream.destroy()
  }
}
