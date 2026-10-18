import type { ConversationRecord } from '../types/ConversationRecord'
import { createConversationFragment } from './createConversationFragment'

/** A two-event fragment of conversation `c` read from the given paths. */
export const createConversationFragmentWithPaths = (
  relativePath: string[],
): ConversationRecord => {
  const fragment = createConversationFragment({ id: 'c', events: 2 })
  return { ...fragment, provenance: { ...fragment.provenance, relativePath } }
}
