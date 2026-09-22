import { constants, promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'

export const backupConversationArchive = async (archive: string, now: Date) => {
  try {
    await fs.access(archive)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }

  const stamp = now.toISOString().replaceAll(/[:.]/gu, '-')
  const backup = join(dirname(archive), `${basename(archive)}.backup-${stamp}`)
  await fs.copyFile(archive, backup, constants.COPYFILE_EXCL)
  await fs.chmod(backup, 0o600)
  return backup
}
