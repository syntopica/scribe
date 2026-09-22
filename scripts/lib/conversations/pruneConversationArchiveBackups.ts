import { promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'

/**
 * Remove every backup of the archive except the one just written.
 *
 * Each `--apply` copies the whole archive to `<archive>.backup-<stamp>` before
 * replacing it, and nothing removed the copies, so a directory ends up holding
 * the live archive plus several same-day copies of it, each gigabytes. One
 * previous generation is what a bad apply needs to be undone; older ones are
 * the same bytes again. Only names carrying the archive's own backup prefix
 * are touched, so a lock, a temporary file, a hand-named copy or another
 * archive's backups beside it stay where they are.
 */
export const pruneConversationArchiveBackups = async (
  archive: string,
  keep: string,
) => {
  const directory = dirname(archive)
  const prefix = `${basename(archive)}.backup-`
  // The exact shape `backupConversationArchive` writes: an ISO stamp with its
  // separators replaced. A prefix match alone would also take a hand-named
  // `archive.jsonl.backup-recovered.jsonl` beside it.
  const stamp = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/u
  const removed: string[] = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !entry.name.startsWith(prefix) ||
      !stamp.test(entry.name.slice(prefix.length))
    )
      continue
    const path = join(directory, entry.name)
    if (path === keep) continue
    await fs.rm(path)
    removed.push(path)
  }
  return removed.toSorted((left, right) => left.localeCompare(right))
}
