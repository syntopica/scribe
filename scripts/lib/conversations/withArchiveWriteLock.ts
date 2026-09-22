import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { isArchiveLockAbandoned } from './isArchiveLockAbandoned'

/**
 * Hold an exclusive claim on the archive for the whole of its publication.
 *
 * The section is not short. It verifies the revision, copies the archive to a
 * backup and writes a fresh one from the merge store, hashing every record on
 * the way -- at 6 GB and 1.2 million records that is tens of minutes, not the
 * seconds an earlier version of this file assumed. That assumption was the
 * bug: the lock was declared stale after a minute, so the next writer reclaimed
 * it mid-publication and both wrote. Neither saw an error, because each had
 * checked the revision before the other renamed, and the loser's conversations
 * simply were not in the archive afterwards.
 *
 * A holder is now recognised by its process, not by its age -- see
 * isArchiveLockAbandoned. Waiting is bounded so a writer that can never make
 * progress fails loudly rather than blocking a scheduled job forever; the
 * bound is a multiple of a whole publication, so ordinary contention waits it
 * out instead of erroring.
 *
 * Correctness does not rest on this alone: the revision check inside the
 * section, and the second one taken immediately before the rename, refuse a
 * lost update even if the lock were bypassed entirely. This exists to make
 * that refusal rare rather than to make it unnecessary.
 */
export const withArchiveWriteLock = async <T>(
  archive: string,
  publish: () => Promise<T>,
): Promise<T> => {
  const retryMs = 250
  // Long enough for a queued writer to sit through a full publication of an
  // archive several times today's size, short enough that a lock nobody will
  // ever release is reported within one scheduling interval.
  const waitMs = Number(process.env['ROCKET_AGENTS_ARCHIVE_LOCK_WAIT_MS'] ?? 0)
  const deadline = Date.now() + (waitMs > 0 ? waitMs : 90 * 60_000)
  const lock = `${archive}.write-lock`
  // The lock sits beside the archive, so on a host that has never held one the
  // directory does not exist yet and taking the lock fails before the writer
  // ever gets to create it. That made the first --apply on a freshly
  // provisioned peer impossible: it reported ENOENT for the lock path while
  // the missing thing was the directory. The archive's own mkdir runs inside
  // this section, which is too late to help the lock.
  await fs.mkdir(dirname(archive), { recursive: true, mode: 0o700 })
  for (;;) {
    try {
      const handle = await fs.open(lock, 'wx', 0o600)
      try {
        await handle.writeFile(`${String(process.pid)}\n`)
      } finally {
        await handle.close()
      }
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (await isArchiveLockAbandoned(lock)) {
        await fs.rm(lock, { force: true })
        continue
      }
      if (Date.now() > deadline)
        throw new Error(`timed out waiting for ${lock}`, { cause: error })
      await delay(retryMs)
    }
  }
  try {
    return await publish()
  } finally {
    await fs.rm(lock, { force: true })
  }
}
