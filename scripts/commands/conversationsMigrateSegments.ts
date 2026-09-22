import { resolve } from 'node:path'
import { migrateConversationArchiveToSegments } from '../lib/conversations/migrateConversationArchiveToSegments'
import { verifyConversationSegmentArchive } from '../lib/conversations/verifyConversationSegmentArchive'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Turn one v1 archive file into a generation of base segments.
 *
 * It reads the input and writes only into `--root`; the v1 file is never
 * modified, so the rollback for a failed migration is to delete the new root.
 * The verification pass runs immediately afterwards and its digests are the
 * numbers a later installation is compared against.
 */
export const main = async () => {
  const archive = flagValue(process.argv, '--archive')
  const requestedRoot = flagValue(process.argv, '--root')
  if (archive === undefined || requestedRoot === undefined) {
    console.error('--archive and --root are required')
    process.exitCode = 2
    return
  }

  const buckets = Number(flagValue(process.argv, '--buckets') ?? '32')
  if (!Number.isInteger(buckets) || buckets < 1 || buckets > 4096) {
    console.error('--buckets must be an integer between 1 and 4096')
    process.exitCode = 2
    return
  }

  const root = resolve(requestedRoot)
  const migrated = await migrateConversationArchiveToSegments({
    archive: resolve(archive),
    root,
    buckets,
    createdAt: flagValue(process.argv, '--now') ?? new Date().toISOString(),
  })
  const verified = await verifyConversationSegmentArchive({ root })
  console.log(
    JSON.stringify(
      {
        ok: verified.ok && migrated.streamed.errors.length === 0,
        root,
        generationId: migrated.generationId,
        baseSegments: migrated.segments.length,
        fragments: migrated.fragments,
        duplicates: migrated.duplicates,
        source: {
          records: migrated.streamed.records,
          errors: migrated.streamed.errors,
        },
        verified,
      },
      null,
      2,
    ),
  )
  if (!verified.ok || migrated.streamed.errors.length > 0) process.exitCode = 1
}
