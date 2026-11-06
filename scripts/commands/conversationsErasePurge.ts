import { join, resolve } from 'node:path'
import { assertConversationWritersNotFrozen } from '../lib/conversations/assertConversationWritersNotFrozen'
import { describeConversationGenerationPurge } from '../lib/conversations/describeConversationGenerationPurge'
import { isConversationDigest } from '../lib/conversations/isConversationDigest'
import { purgeConversationArchiveGeneration } from '../lib/conversations/purgeConversationArchiveGeneration'
import { withArchiveWriteLock } from '../lib/conversations/withArchiveWriteLock'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Report, and with `--apply` remove, a generation nothing selects.
 *
 * Every erasure seals a full new generation and leaves the old one for
 * rollback, so each redaction of a large archive leaves gigabytes behind.
 * The selected generation is always refused, and the one it was rewritten from
 * unless `--include-rollback` gives the rollback up. Without `--apply` nothing
 * changes; with it the checks run again under the archive write lock.
 */
export const conversationsErasePurge = async (argv: string[]) => {
  const requestedRoot = flagValue(argv, '--root')
  const generationId = flagValue(argv, '--generation')
  if (requestedRoot === undefined || generationId === undefined) {
    console.error('--root and --generation are required')
    process.exitCode = 2
    return
  }
  if (!isConversationDigest(generationId)) {
    console.error('--generation must be a 64-character hex generation id')
    process.exitCode = 2
    return
  }
  const root = resolve(requestedRoot)
  const options = {
    root,
    generationId,
    includeRollback: argv.includes('--include-rollback'),
  }
  if (!argv.includes('--apply')) {
    const purge = await describeConversationGenerationPurge(options)
    console.log(JSON.stringify({ ...purge, applied: false }, null, 2))
    if (purge.refusal !== undefined) process.exitCode = 1
    return
  }
  const migrationFrozen = argv.includes('--migration-frozen')
  await assertConversationWritersNotFrozen(migrationFrozen)
  const purge = await withArchiveWriteLock(
    join(root, 'archive'),
    async () => {
      const described = await describeConversationGenerationPurge(options)
      if (described.refusal === undefined)
        await purgeConversationArchiveGeneration(root, generationId)
      return described
    },
    migrationFrozen,
  )
  console.log(
    JSON.stringify({ ...purge, applied: purge.refusal === undefined }, null, 2),
  )
  if (purge.refusal !== undefined) process.exitCode = 1
}
