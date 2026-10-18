import { hashConversationFragment } from './hashConversationFragment'
import { readConversationArchiveSegment } from './readConversationArchiveSegment'
import type { ConversationRecord } from './types/ConversationRecord'
import type { StreamConversationErasureSurvivorsOptions } from './types/StreamConversationErasureSurvivorsOptions'

/**
 * The fragments of a generation that an erasure keeps, one segment at a time.
 *
 * Each record carries the hosts its entry named, because the segment
 * serializer reads them from the record and a rewrite that dropped them would
 * lose the one fact about a conversation the other machine cannot supply.
 * Which hashes were kept and which removed is reported into the two sets the
 * caller passes, so it can account for the plan after the stream ends. A
 * redaction streams each removed fragment's replacement in its place.
 */
export const streamConversationErasureSurvivors = async function* (
  options: StreamConversationErasureSurvivorsOptions,
): AsyncGenerator<ConversationRecord> {
  for (const sha256 of options.segmentSha256) {
    const segment = await readConversationArchiveSegment({
      segmentsDirectory: options.segmentsDirectory,
      sha256,
      generation: options.generation,
    })
    for (const entry of segment.entries) {
      const record =
        entry.hosts === undefined
          ? entry.record
          : { ...entry.record, hosts: entry.hosts }
      if (!options.removing.has(entry.fragmentSha256)) {
        options.kept.add(entry.fragmentSha256)
        yield record
        continue
      }
      options.removed.add(entry.fragmentSha256)
      if (options.replace === undefined) continue
      const replacement = options.replace(record)
      options.replaced?.set(
        entry.fragmentSha256,
        hashConversationFragment(replacement),
      )
      yield replacement
    }
  }
}
