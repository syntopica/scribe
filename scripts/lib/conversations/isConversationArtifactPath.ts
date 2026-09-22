import { basename } from 'node:path'
import { CONVERSATION_EXCLUDED_PATH_PARTS } from './constants/CONVERSATION_EXCLUDED_PATH_PARTS'

export const isConversationArtifactPath = (path: string) => {
  const parts = path.split(/[\\/]/u)
  if (parts.some((part) => CONVERSATION_EXCLUDED_PATH_PARTS.has(part)))
    return false

  const name = basename(path)
  return (
    !name.endsWith('-wal') && !name.endsWith('-shm') && name !== 'sessions.json'
  )
}
