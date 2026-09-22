import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { isConversationArtifactPath } from './isConversationArtifactPath'
import { storageKindForPath } from './storageKindForPath'
import type { ConversationPathInspection } from './types/ConversationPathInspection'

export const inspectConversationPath = async (
  path: string,
): Promise<ConversationPathInspection> => {
  let stat
  try {
    stat = await fs.lstat(path)
  } catch {
    return { kind: 'skip' }
  }

  if (stat.isSymbolicLink()) return { kind: 'skip' }
  if (stat.isFile()) {
    return storageKindForPath(path) !== undefined &&
      isConversationArtifactPath(path)
      ? { kind: 'file', path }
      : { kind: 'skip' }
  }
  if (!stat.isDirectory()) return { kind: 'skip' }

  try {
    const entries = await fs.readdir(path)
    return {
      kind: 'directory',
      paths: entries
        .filter((entry) => isConversationArtifactPath(entry))
        .map((entry) => join(path, entry)),
    }
  } catch {
    return { kind: 'skip' }
  }
}
