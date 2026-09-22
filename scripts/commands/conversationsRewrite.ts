import { resolve } from 'node:path'
import { rewriteConversationArchive } from '../lib/conversations/rewriteConversationArchive'
import { flagValue } from '../lib/machine/cli/flagValue'
import { flagValues } from '../lib/machine/cli/flagValues'

/**
 * One-off repair of a v1 archive: deduplicated provenance paths and the named
 * home prefixes redacted out of stored records.
 *
 * `--home` is explicit and repeatable rather than defaulting to `homedir()`:
 * the two Macs have to run the identical rewrite to converge, and a default
 * taken from whichever account happens to run the command is exactly how the
 * unredacted values got in. Dry by default; `--apply` publishes under the
 * same lock and checks the import path uses.
 */
export const main = async () => {
  const requestedArchive = flagValue(process.argv, '--archive')
  const homes = flagValues(process.argv, '--home')
  if (requestedArchive === undefined || homes.length === 0) {
    console.error(
      '--archive and at least one --home <absolute prefix to redact> are required',
    )
    process.exitCode = 2
    return
  }
  const result = await rewriteConversationArchive({
    archive: resolve(requestedArchive),
    homes,
    apply: process.argv.includes('--apply'),
  })
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.ok ? 0 : 1
}
