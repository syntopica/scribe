import { resolve } from 'node:path'
import { verifyConversationSegmentArchive } from '../lib/conversations/verifyConversationSegmentArchive'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * Read an archive back and print the digests two installations must share.
 *
 * Deliberately builds its own throwaway state rather than reading the one
 * capture keeps: a verifier that trusted the cache would pass on exactly the
 * corruption it exists to find.
 */
export const main = async () => {
  const requestedRoot = flagValue(process.argv, '--root')
  if (requestedRoot === undefined) {
    console.error('--root is required')
    process.exitCode = 2
    return
  }

  const verified = await verifyConversationSegmentArchive({
    root: resolve(requestedRoot),
  })
  console.log(JSON.stringify(verified, null, 2))
  if (!verified.ok) process.exitCode = 1
}
