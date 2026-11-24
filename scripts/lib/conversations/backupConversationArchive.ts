import { promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { cloneArchiveFile } from './cloneArchiveFile'

/**
 * Copy the archive to `<archive>.backup-<stamp>`, beside it or, when
 * `backupDirectory` is given, in that directory (created if missing). The
 * copy is never a rename, so a directory on another volume stays correct.
 */
export const backupConversationArchive = async (
  archive: string,
  now: Date,
  backupDirectory?: string,
) => {
  try {
    await fs.access(archive)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }

  const stamp = now.toISOString().replaceAll(/[:.]/gu, '-')
  const directory = backupDirectory ?? dirname(archive)
  await fs.mkdir(directory, { recursive: true })
  const backup = join(directory, `${basename(archive)}.backup-${stamp}`)
  await cloneArchiveFile(archive, backup)
  await fs.chmod(backup, 0o600)
  return backup
}
