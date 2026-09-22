import { extname } from 'node:path'
import type { ConversationStorageKind } from './types/ConversationStorageKind'

export const storageKindForPath = (
  path: string,
): ConversationStorageKind | undefined => {
  const extension = extname(path).toLowerCase()

  if (extension === '.jsonl') return 'jsonl'
  if (extension === '.json') return 'json'
  if (extension === '.db' || extension === '.vscdb') return 'sqlite'
  if (extension === '.dat') return 'tauri'
  return undefined
}
