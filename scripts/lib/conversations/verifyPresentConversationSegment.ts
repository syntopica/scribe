import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { fsyncConversationDirectory } from './fsyncConversationDirectory'
import { hashText } from './hashText'

/**
 * Prove a segment already on disk holds the bytes its name claims, and make
 * it durable, before a caller deletes another copy on the strength of it.
 * Publication trusts an existing name by its existence alone.
 */
export const verifyPresentConversationSegment = async (
  path: string,
  sha256: string,
) => {
  const handle = await fs.open(path, 'r')
  try {
    if (hashText(await handle.readFile('utf8')) !== sha256) return false
    await handle.sync()
  } finally {
    await handle.close()
  }
  await fsyncConversationDirectory(dirname(path))
  return true
}
