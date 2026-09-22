import { conversationRecordFromDocument } from '../conversationRecordFromDocument'

export const createConversationRecord = () => {
  const record = conversationRecordFromDocument({
    contents: JSON.stringify({
      role: 'user',
      content: 'Remember this decision',
    }),
    relativePath: '.continue/sessions/session.json',
    source: 'continue',
    sourceIdHint: 'session',
  })
  if (record === undefined)
    throw new Error('fixture did not produce a conversation record')
  return record
}
