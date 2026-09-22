import type { ConversationSourceStatus } from '../types/ConversationSourceStatus'

export const formatConversationDoctor = (
  statuses: ConversationSourceStatus[],
) =>
  [
    'Conversation source inventory',
    ...statuses.map((status) => {
      const state = status.available ? 'available' : 'unavailable'
      const counts = `${String(status.files)} files, ${String(status.databases)} databases`
      const reason = status.reason === undefined ? '' : ` - ${status.reason}`
      return `  ${status.source.padEnd(12)} ${state.padEnd(11)} ${counts}${reason}`
    }),
  ].join('\n')
