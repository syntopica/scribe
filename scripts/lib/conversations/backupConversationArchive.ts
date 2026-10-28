import { promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { cloneArchiveFile } from './cloneArchiveFile'

export const backupConversationArchive = async (archive: string, now: Date) => {
  try {
    await fs.access(archive)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }

  const stamp = now.toISOString().replaceAll(/[:.]/gu, '-')
  const backup = join(dirname(archive), `${basename(archive)}.backup-${stamp}`)
  await cloneArchiveFile(archive, backup)
  await fs.chmod(backup, 0o600)
  return backup
}
