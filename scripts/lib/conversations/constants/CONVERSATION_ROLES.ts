import type { ConversationRole } from '../types/ConversationRole'

export const CONVERSATION_ROLES = new Set<ConversationRole>([
  'assistant',
  'developer',
  'system',
  'tool',
  'unknown',
  'user',
])
