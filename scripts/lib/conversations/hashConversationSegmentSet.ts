import { hashText } from './hashText'

/**
 * One digest for a set of segment names, the same on every host.
 *
 * Content addressing makes a generation's inventory a set, so the digest sorts
 * before hashing: two hosts holding the same segments agree on it whatever
 * order their directory listing returned. An erasure plan binds itself to this
 * value, which is how applying it to an archive that has moved is refused.
 */
export const hashConversationSegmentSet = (segmentSha256: readonly string[]) =>
  hashText(
    [...segmentSha256]
      .toSorted((left, right) => left.localeCompare(right))
      .join('\n'),
  )
