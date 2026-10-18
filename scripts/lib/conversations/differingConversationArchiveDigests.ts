import type { ConversationArchiveDigests } from './types/ConversationArchiveDigests'

/** The names among `keys` whose digests differ between the two sets. */
export const differingConversationArchiveDigests = (
  expected: ConversationArchiveDigests,
  actual: ConversationArchiveDigests,
  keys: readonly (keyof ConversationArchiveDigests)[] = [
    'generationId',
    'segmentSet',
    'conversationIds',
    'eventSet',
    'materializedState',
  ],
) => keys.filter((key) => expected[key] !== actual[key])
