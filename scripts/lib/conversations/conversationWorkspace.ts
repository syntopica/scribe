import { CONVERSATION_WORKSPACE_KEYS } from './constants/CONVERSATION_WORKSPACE_KEYS'
import { findStringByKeys } from './findStringByKeys'

export const conversationWorkspace = (records: unknown[]) => {
  for (const record of records) {
    const found = findStringByKeys(record, CONVERSATION_WORKSPACE_KEYS)
    if (found !== undefined) return found
  }
  return undefined
}
