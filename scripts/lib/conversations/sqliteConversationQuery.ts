import type { ConversationSource } from './types/ConversationSource'

export const sqliteConversationQuery = (
  table: string,
  source: ConversationSource,
) => {
  if (source === 'cursor' && table === 'cursorDiskKV') return undefined
  if (source === 'cursor' && table === 'ItemTable') return undefined
  if (['ItemTable', 'cursorDiskKV'].includes(table)) {
    // The key filter is a wide net, so the value has to carry an object for the
    // row to be dialogue at all: an event needs a role, a text or a timestamp,
    // and those only exist inside `{}`. Without this, editor UI state slips
    // through whenever its key happens to contain one of these words - Trae's
    // `icube-ai-chat-storage-mention-search-selected-itemIds` held
    // `["rule","code"]`, and the mention picker's item ids were exported as a
    // conversation.
    return `SELECT rowid AS record_id, key, CAST(value AS TEXT) AS value FROM "${table}" WHERE (lower(key) LIKE '%chat%' OR lower(key) LIKE '%conversation%' OR lower(key) LIKE '%composer%' OR lower(key) LIKE '%agent%' OR lower(key) LIKE '%flow%' OR lower(key) LIKE '%cascade%' OR lower(key) LIKE '%prompt%' OR lower(key) LIKE '%generation%') AND CAST(value AS TEXT) LIKE '%{%'`
  }
  if (['message', 'part', 'session'].includes(table)) {
    return `SELECT rowid AS record_id, * FROM "${table}"`
  }
  return undefined
}
