import { addKnownSecretValues } from './addKnownSecretValues'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import type { CollectKnownSecretValuesOptions } from './types/CollectKnownSecretValuesOptions'

/**
 * Every token-shaped value the pattern redactor removes from the entries a
 * redaction covers, read one segment at a time.
 *
 * Plan, apply and verify each derive the set from the same generation and the
 * same redactor, both of which the plan pins, so the set itself is never
 * written down: it is a list of credentials.
 */
export const collectKnownSecretValues = async (
  options: CollectKnownSecretValuesOptions,
) => {
  const values = new Set<string>()
  for (const sha256 of options.segmentSha256) {
    const segment = await readConversationArchiveSegment({
      segmentsDirectory: options.segmentsDirectory,
      sha256,
      generation: options.generation,
    })
    for (const entry of segment.entries)
      if (options.includes(entry)) addKnownSecretValues(entry.record, values)
  }
  return values
}
