import type { ConversationEvent } from './types/ConversationEvent'

export const conversationEventHeading = (event: ConversationEvent) => {
  const timestamp = event.timestamp === undefined ? '' : ` - ${event.timestamp}`
  return `## ${event.role} - ${event.kind}${timestamp}`
}
