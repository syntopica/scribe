import type { ConversationEvent } from './types/ConversationEvent'

export const conversationTitle = (
  events: ConversationEvent[],
  fallback: string,
) => {
  const firstUserMessage = events.find(
    (event) => event.role === 'user' && event.kind === 'message',
  )
  const title = firstUserMessage?.text.split('\n')[0]?.trim() ?? fallback
  return title.length <= 120 ? title : `${title.slice(0, 117)}...`
}
