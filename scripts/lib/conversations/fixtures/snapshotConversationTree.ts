import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { hashText } from '../hashText'
import { compareConversationNames } from './compareConversationNames'

/** Every file under `root` with a digest of its bytes, sorted by path. */
export const snapshotConversationTree = async (root: string) => {
  const entries = await fs.readdir(root, {
    recursive: true,
    withFileTypes: true,
  })
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort(compareConversationNames)
  return Promise.all(
    files.map(async (file) => [
      file,
      hashText(await fs.readFile(file, 'utf8')),
    ]),
  )
}
