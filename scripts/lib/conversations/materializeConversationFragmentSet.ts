import { collectConversationEventVariants } from './collectConversationEventVariants'
import { compareConversationEvents } from './compareConversationEvents'
import { deriveConversationFragmentSetProvenance } from './deriveConversationFragmentSetProvenance'
import { hashConversationFragment } from './hashConversationFragment'
import { mergeConversationHosts } from './mergeConversationHosts'
import type { ConversationFragmentSet } from './types/ConversationFragmentSet'
import type { ConversationRecord } from './types/ConversationRecord'
import { upgradeConversationRecord } from './upgradeConversationRecord'

/**
 * Reduce every observed fragment of one conversation to a single record.
 *
 * A set operation, not a fold. `mergeConversationRecordFragments` is
 * commutative for a pair, but its provenance hash nests, so folding it over
 * three fragments gives an answer that depends on how they were grouped --
 * measured: `(a+b)+c` and `a+(b+c)` produce different provenance hashes for
 * the same three fragments. Two hosts that received them in different orders
 * would then disagree forever about a conversation they both hold completely,
 * and each import would see the other's record as changed. Here every field is
 * derived from the whole sorted set at once, so A then B, B then A, and A
 * twice all produce identical bytes.
 *
 * Fragments are upgraded before anything is read off them. A version 1 event
 * id is unqualified, so comparing the two schemas directly would carry the
 * same event twice under two ids.
 */
export const materializeConversationFragmentSet = (
  fragments: ConversationRecord[],
): ConversationFragmentSet => {
  // Hosts are unioned over every input before identical fragments collapse
  // to one: two machines' readings of the same bytes are one fragment and two
  // observations, and the second must not vanish with the duplicate.
  const hosts = mergeConversationHosts(
    ...fragments.map((fragment) => fragment.hosts),
  )
  const distinct = new Map<string, ConversationRecord>()
  for (const fragment of fragments.map(upgradeConversationRecord)) {
    distinct.set(hashConversationFragment(fragment), fragment)
  }
  const ordered = [...distinct.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([hash, record]) => ({ hash, record }))

  const first = ordered.at(0)
  if (first === undefined) {
    throw new Error('a conversation cannot be materialized from no fragments')
  }
  for (const { record } of ordered) {
    if (
      record.id !== first.record.id ||
      record.source !== first.record.source ||
      record.sourceId !== first.record.sourceId
    ) {
      throw new Error('cannot materialize unrelated conversation fragments')
    }
  }

  const { events, conflicts } = collectConversationEventVariants(
    ordered.map(({ record }) => record),
  )
  events.sort(compareConversationEvents)

  const timestamps = events.flatMap((event) =>
    event.timestamp === undefined ? [] : [event.timestamp],
  )
  const startedAt =
    timestamps.at(0) ??
    ordered
      .flatMap(({ record }) =>
        record.startedAt === undefined ? [] : [record.startedAt],
      )
      .at(0)
  const updatedAt =
    timestamps.at(-1) ??
    ordered
      .flatMap(({ record }) =>
        record.updatedAt === undefined ? [] : [record.updatedAt],
      )
      .at(-1)
  const workspace = ordered
    .flatMap(({ record }) =>
      record.workspace === undefined ? [] : [record.workspace],
    )
    .at(0)

  return {
    record: {
      schemaVersion: first.record.schemaVersion,
      id: first.record.id,
      source: first.record.source,
      sourceId: first.record.sourceId,
      title: first.record.title,
      events,
      provenance: deriveConversationFragmentSetProvenance(ordered),
      ...(startedAt === undefined ? {} : { startedAt }),
      ...(updatedAt === undefined ? {} : { updatedAt }),
      ...(workspace === undefined ? {} : { workspace }),
      ...(hosts === undefined ? {} : { hosts }),
    },
    conflicts,
  }
}
