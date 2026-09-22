import { hashText } from './hashText'
import { mergeConversationHosts } from './mergeConversationHosts'
import type { ConversationRecord } from './types/ConversationRecord'
import { upgradeConversationRecord } from './upgradeConversationRecord'

export const mergeConversationRecordFragments = (
  firstFragment: ConversationRecord,
  secondFragment: ConversationRecord,
): ConversationRecord => {
  if (
    firstFragment.id !== secondFragment.id ||
    firstFragment.source !== secondFragment.source ||
    firstFragment.sourceId !== secondFragment.sourceId
  ) {
    throw new Error('cannot merge unrelated conversation fragments')
  }
  // Both sides are brought onto the current schema before anything is read
  // off them: a version 1 event id is unqualified, so merging the two as they
  // are would carry the same event twice under two ids. The upgrade is exact,
  // so no event is lost on either side.
  const [first, second] = [
    upgradeConversationRecord(firstFragment),
    upgradeConversationRecord(secondFragment),
  ]
  // Ordered canonically before anything is read off either side, so merging
  // is commutative: two hosts exchanging the same pair of revisions have to
  // reach the same record, whichever one arrives first. Fields taken from a
  // single side -- title, workspace -- would otherwise depend on argument
  // order, and so would the merged event order.
  const [left, right] =
    first.provenance.contentSha256.localeCompare(
      second.provenance.contentSha256,
    ) <= 0
      ? [first, second]
      : [second, first]
  const events = new Map(left.events.map((event) => [event.id, event]))
  for (const event of right.events) events.set(event.id, event)
  const hashes = [
    left.provenance.contentSha256,
    right.provenance.contentSha256,
  ].toSorted((a, b) => a.localeCompare(b))
  // Each side may already be a merge, so its path is a joined list; split it
  // before taking the union or every re-merge repeats every earlier entry.
  // Measured on the live archive: 3,225 records carried a joined path, one of
  // them 87,269 entries long, 1.5 GB of the 7 GB file. The comma is the
  // format's separator, so a source filename carrying one would be split
  // here; none does on either Mac's sources (measured 2026-09-09), and the
  // separator is the thing to change when the format next moves.
  const relativePaths = [
    ...new Set(
      [left, right].flatMap((side) => side.provenance.relativePath.split(',')),
    ),
  ].toSorted((a, b) => a.localeCompare(b))
  const timestamps = [...events.values()]
    .flatMap((event) =>
      event.timestamp === undefined ? [] : [event.timestamp],
    )
    .toSorted((a, b) => a.localeCompare(b))
  const startedAt = timestamps.at(0) ?? left.startedAt ?? right.startedAt
  const updatedAt = timestamps.at(-1) ?? right.updatedAt ?? left.updatedAt
  const workspace = left.workspace ?? right.workspace
  const hosts = mergeConversationHosts(left.hosts, right.hosts)

  // Sorted rather than left-then-right: the union is the same either way, but
  // the sequence a reader sees should not depend on which fragment arrived
  // first. Events without a timestamp keep a stable place by id.
  const ordered = [...events.values()].toSorted((a, b) => {
    const byTime = (a.timestamp ?? '').localeCompare(b.timestamp ?? '')
    return byTime === 0 ? a.id.localeCompare(b.id) : byTime
  })

  return {
    ...left,
    events: ordered,
    provenance: {
      contentSha256: hashText(hashes.join('\0')),
      relativePath: relativePaths.join(','),
      redactions: left.provenance.redactions + right.provenance.redactions,
    },
    ...(startedAt === undefined ? {} : { startedAt }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(workspace === undefined ? {} : { workspace }),
    ...(hosts === undefined ? {} : { hosts }),
  }
}
