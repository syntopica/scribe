import { promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { isProcessGone } from './isProcessGone'

/**
 * Remove the replacement files that interrupted publications left beside the
 * archive.
 *
 * Every publication writes `<archive>.tmp-<pid>` and renames it over the
 * archive; a run killed in between leaves the temporary behind, gigabytes of
 * it, and nothing else ever removes it. The name carries the writer's process
 * id, so the test is the one the write lock already uses: a writer whose
 * process is gone cannot finish, and its file is wreckage. A live or recycled
 * id keeps its file. Only the exact `<archive>.tmp-<digits>` shape is touched,
 * so another archive's temporaries and hand-named copies stay.
 */
export const removeAbandonedArchiveTemporaries = async (archive: string) => {
  const directory = dirname(archive)
  const prefix = `${basename(archive)}.tmp-`
  const removed: string[] = []
  const entries = await fs
    .readdir(directory, { withFileTypes: true })
    .catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    })
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.startsWith(prefix)) continue
    const id = entry.name.slice(prefix.length)
    if (!/^[1-9]\d*$/u.test(id) || !isProcessGone(Number(id))) continue
    const path = join(directory, entry.name)
    await fs.rm(path, { force: true })
    removed.push(path)
  }
  return removed.toSorted((left, right) => left.localeCompare(right))
}
