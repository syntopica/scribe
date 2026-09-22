import { hashText } from './hashText'
import { serializeCanonicalConversationRecord } from './serializeCanonicalConversationRecord'
import type { ConversationRecord } from './types/ConversationRecord'

/**
 * The identity of one observed revision of a conversation.
 *
 * A fragment is identified by what it contains, not by when it arrived or
 * which host produced it. Two hosts that captured the same bytes publish one
 * fragment; two hosts that captured different lengths of the same conversation
 * publish two, and neither supersedes the other -- which is the property that
 * kept 3 events alive when one machine held 353 and the other 356.
 */
export const hashConversationFragment = (record: ConversationRecord) =>
  hashText(serializeCanonicalConversationRecord(record))
