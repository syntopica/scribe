import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'

/**
 * Write JSON to a path that must not exist yet, atomically.
 *
 * The bytes go to a temporary file first and are linked into place; a link
 * cannot overwrite, so an existing file is refused rather than replaced and a
 * reader never sees half a file.
 */
export const writeNewConversationJsonFile = async (
  path: string,
  value: unknown,
) => {
  const temporary = `${path}.tmp-${randomUUID()}`
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
    flag: 'wx',
  })
  try {
    await fs.link(temporary, path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`${path} already exists; refusing to overwrite it`, {
        cause: error,
      })
    }
    throw error
  } finally {
    await fs.rm(temporary, { force: true })
  }
}
