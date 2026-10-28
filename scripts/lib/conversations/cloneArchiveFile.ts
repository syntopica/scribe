import { execFile } from 'node:child_process'
import { constants, promises as fs } from 'node:fs'
import { promisify } from 'node:util'

/**
 * Copy `source` to `target`, refusing an existing target, as a copy-on-write
 * clone wherever the volume can make one.
 *
 * Node's COPYFILE_FICLONE does not clone on macOS (FICLONE_FORCE is ENOSYS),
 * so a backup of the 8 GB archive was a full byte copy on every import: tens
 * of seconds of disk writes and 8 GB more at the publication's peak.
 * `cp -c` clones on APFS in milliseconds and falls back to a copy itself
 * across volumes; `-n` makes it exit non-zero rather than overwrite.
 */
export const cloneArchiveFile = async (source: string, target: string) => {
  if (process.platform === 'darwin') {
    await promisify(execFile)('/bin/cp', ['-c', '-n', source, target])
    return
  }
  await fs.copyFile(source, target, constants.COPYFILE_EXCL)
}
