/** What happened to one staged segment file during a receive. */
export type ConversationStagedSegmentOutcome =
  | { outcome: 'received' | 'alreadyPresent'; sha256: string }
  | { outcome: 'refused'; reason: string }
