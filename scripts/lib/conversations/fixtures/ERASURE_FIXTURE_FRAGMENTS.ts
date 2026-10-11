import { createConversationFragment } from './createConversationFragment'

/**
 * The fragments every erasure test starts from: a leaked revision and a clean
 * revision of one conversation, an unrelated conversation, and one a later
 * capture appended.
 */
export const ERASURE_FIXTURE_FRAGMENTS = {
  leaked: createConversationFragment({ id: 'a', events: 2, source: 'leak' }),
  clean: createConversationFragment({ id: 'a', events: 3, source: 'ok' }),
  other: createConversationFragment({ id: 'b', events: 1 }),
  captured: createConversationFragment({ id: 'c', events: 2 }),
}
