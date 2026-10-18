import { promises as fs } from 'node:fs'

/** Conversation ids listed one per line; blank lines are ignored. */
export const readConversationIdsFile = async (path: string) =>
  (await fs.readFile(path, 'utf8'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
