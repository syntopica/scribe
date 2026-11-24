import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { IMPORT_DIRECTORY_MIN_AGE_MS } from './constants/IMPORT_DIRECTORY_MIN_AGE_MS'
import { IMPORT_DIRECTORY_PREFIX } from './constants/IMPORT_DIRECTORY_PREFIX'
import { IMPORT_OWNER_FILE } from './constants/IMPORT_OWNER_FILE'
import { isProcessGone } from './isProcessGone'
import type { RemoveAbandonedImportDirectoriesOptions } from './types/RemoveAbandonedImportDirectoriesOptions'

/**
 * Remove the capture directories that killed imports left in the temporary
 * root, gigabytes each.
 *
 * Conservative by design, since this deletes data. A directory is removed only
 * when its owner file names a process that is gone, or, for a directory with no
 * usable owner file (one that predates the marker, or one whose run has not
 * written it yet), when it has not been touched for a day. A live or recycled
 * process id, a young unmarked directory, or any error reading one keeps it,
 * and the keep is logged. Only entries that are directories and start with the
 * import prefix are looked at.
 */
export const removeAbandonedImportDirectories = async (
  options: RemoveAbandonedImportDirectoriesOptions = {},
) => {
  const root = options.root ?? tmpdir()
  const now = options.now ?? Date.now()
  const log = options.log ?? ((message) => process.stderr.write(`${message}\n`))
  const removed: string[] = []
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(IMPORT_DIRECTORY_PREFIX))
      continue
    const path = join(root, entry.name)
    try {
      const owner = await readFile(join(path, IMPORT_OWNER_FILE), 'utf8').catch(
        () => '',
      )
      const pid = /^[1-9]\d*$/u.test(owner.trim()) ? Number(owner.trim()) : 0
      const abandoned =
        pid > 0
          ? isProcessGone(pid)
          : now - (await stat(path)).mtimeMs > IMPORT_DIRECTORY_MIN_AGE_MS
      if (!abandoned) {
        log(`kept import directory ${path}: its owner may still be running`)
        continue
      }
      await rm(path, { recursive: true, force: true })
      removed.push(path)
    } catch (error) {
      log(`kept import directory ${path}: ${(error as Error).message}`)
    }
  }
  return removed.toSorted((left, right) => left.localeCompare(right))
}
