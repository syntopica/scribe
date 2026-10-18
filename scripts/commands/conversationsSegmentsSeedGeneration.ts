import { resolve } from 'node:path'
import { assertConversationWritersNotFrozen } from '../lib/conversations/assertConversationWritersNotFrozen'
import { isConversationDigest } from '../lib/conversations/isConversationDigest'
import { seedConversationArchiveGeneration } from '../lib/conversations/seedConversationArchiveGeneration'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * `scribe segments-seed-generation --root <root> --from <staging>
 * --generation <id>`: copy a whole generation a peer staged, verified, and
 * select nothing.
 *
 * The staging directory has the archive layout,
 * `<staging>/generations/g_<id>/{generation.json,segments/}`. Selecting the
 * seeded generation is a separate, explicit step:
 * `scribe erase activate --root <root> --generation <id>`. Every flag is
 * required, so the command cannot reach a live archive by omission.
 */
export const main = async () => {
  const requestedRoot = flagValue(process.argv, '--root')
  const from = flagValue(process.argv, '--from')
  const generationId = flagValue(process.argv, '--generation')
  if (
    requestedRoot === undefined ||
    from === undefined ||
    generationId === undefined
  ) {
    console.error('--root, --from and --generation are required')
    process.exitCode = 2
    return
  }
  if (!isConversationDigest(generationId)) {
    console.error('--generation must be a 64-character hex generation id')
    process.exitCode = 2
    return
  }
  const migrationFrozen = process.argv.includes('--migration-frozen')
  await assertConversationWritersNotFrozen(migrationFrozen)
  const result = await seedConversationArchiveGeneration({
    root: resolve(requestedRoot),
    from: resolve(from),
    generationId,
    migrationFrozen,
  })
  console.log(JSON.stringify(result, null, 2))
}
