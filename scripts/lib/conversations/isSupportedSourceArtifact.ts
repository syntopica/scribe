import type { ConversationSourceDefinition } from './types/ConversationSourceDefinition'
import type { ConversationStorageKind } from './types/ConversationStorageKind'

export const isSupportedSourceArtifact = (
  definition: ConversationSourceDefinition,
  configuredRoot: string,
  storage: ConversationStorageKind,
) => {
  if (!definition.storage.includes(storage)) return false
  if (
    definition.id === 'opencode' &&
    configuredRoot.endsWith('ai.opencode.app')
  ) {
    return storage === 'tauri'
  }
  return true
}
