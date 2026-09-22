import { promises as fs } from 'node:fs'

/**
 * Decide whether a lock file left on disk belongs to a writer that is gone.
 *
 * Age is not the signal. The publication section writes a full copy of the
 * archive and hashes every record in it, which at several gigabytes takes tens
 * of minutes, and the work is synchronous: no timer inside the holder can
 * prove liveness while it runs, because nothing else on that thread runs
 * either. A previous version declared any lock older than a minute to be
 * wreckage, which meant every long publication was reclaimed by the next
 * writer while it was still running.
 *
 * The holder's process identity is the signal instead. A lock whose recorded
 * process no longer exists cannot be released by anyone else, so reclaiming it
 * is the only way forward; a lock whose process is still there is held, for
 * however long that takes. Identity is checked with signal 0, which tests for
 * the process without disturbing it.
 *
 * A lock this cannot read at all -- truncated, or written by a version that
 * recorded nothing -- is treated as held rather than abandoned, so a parse
 * failure can never authorise a concurrent write. The waiting writer's own
 * deadline turns that into a visible timeout instead of a silent overwrite.
 */
export const isArchiveLockAbandoned = async (lock: string) => {
  const text = await fs.readFile(lock, 'utf8').catch(() => undefined)
  // Gone between the failed create and this read: whoever removed it has
  // already released it, so the caller should try to take it again.
  if (text === undefined) return true
  const pid = Number.parseInt(text.trim().split('\n')[0] ?? '', 10)
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return false
  } catch (error) {
    // EPERM means the process exists and belongs to someone else, which is
    // still a live holder. Only ESRCH says nothing is there.
    return (error as NodeJS.ErrnoException).code === 'ESRCH'
  }
}
