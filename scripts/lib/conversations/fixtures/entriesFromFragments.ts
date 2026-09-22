import type { ConversationRecord } from '../types/ConversationRecord'
import { validateConversationSegment } from '../validators/validateConversationSegment'
import { createConversationSegment } from './createConversationSegment'

/** The validated entries a set of fragments produces, as an erasure plan sees them. */
export const entriesFromFragments = (fragments: ConversationRecord[]) =>
  validateConversationSegment(createConversationSegment(fragments)).entries
