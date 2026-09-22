import { CONVERSATION_SOURCES } from './constants/CONVERSATION_SOURCES'
import type { ConversationSource } from './types/ConversationSource'

export const isConversationSource = (
  value: unknown,
): value is ConversationSource =>
  typeof value === 'string' &&
  CONVERSATION_SOURCES.some((source) => source === value)
