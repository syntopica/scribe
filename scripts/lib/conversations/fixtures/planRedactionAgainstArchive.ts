import { planConversationArchiveErasureFromRoot } from '../planConversationArchiveErasureFromRoot'

/** A redaction plan for conversation `s` of a test archive, as it stands now. */
export const planRedactionAgainstArchive = async (root: string) =>
  planConversationArchiveErasureFromRoot({
    root,
    createdAt: '2026-10-18T12:00:00.000Z',
    reason: 'redaction',
    removeConversationIds: ['s'],
  })
