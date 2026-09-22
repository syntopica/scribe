import type { ConversationRecord } from '../types/ConversationRecord'
import { createConversationRecord } from './createConversationRecord'

/**
 * A record whose title and event text carry raw U+2028 and U+2029, the two
 * characters JSON leaves unescaped and a readline-based reader mistakes for
 * line breaks. The live archive holds 1,690 and 3 of them.
 */
export const createConversationRecordWithLineSeparators =
  (): ConversationRecord => {
    const base = createConversationRecord()
    return {
      ...base,
      title: 'title with separator',
      events: base.events.map((event) => ({
        ...event,
        text: 'first paragraph second line third paragraph',
      })),
    }
  }
