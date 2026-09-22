import { promises as fs } from 'node:fs'
import { MAX_CONVERSATION_FILE_BYTES } from './constants/MAX_CONVERSATION_FILE_BYTES'

/**
 * lstat, never stat: a symlink reports its own size here and then fails the
 * O_NOFOLLOW open in the whole-document reader, which is where that refusal
 * belongs.
 */
export const exceedsConversationFileBound = async (path: string) => {
  const stat = await fs.lstat(path).catch(() => undefined)
  return stat?.isFile() === true && stat.size > MAX_CONVERSATION_FILE_BYTES
}
