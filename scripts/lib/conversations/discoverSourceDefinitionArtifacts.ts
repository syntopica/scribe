import { isAbsolute, join, relative } from 'node:path'
import { isSupportedSourceArtifact } from './isSupportedSourceArtifact'
import { storageKindForPath } from './storageKindForPath'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationSourceDefinition } from './types/ConversationSourceDefinition'
import { walkConversationFiles } from './walkConversationFiles'

export const discoverSourceDefinitionArtifacts = async (
  home: string,
  definition: ConversationSourceDefinition,
) => {
  const artifacts: ConversationArtifact[] = []

  for (const configuredRoot of definition.roots) {
    const root = isAbsolute(configuredRoot)
      ? configuredRoot
      : join(home, configuredRoot)
    for (const path of await walkConversationFiles(root)) {
      const storage = storageKindForPath(path)
      if (
        storage === undefined ||
        !isSupportedSourceArtifact(definition, configuredRoot, storage)
      )
        continue

      const relativePath = relative(home, path)
      if (relativePath.startsWith('..') || isAbsolute(relativePath)) continue
      artifacts.push({ path, relativePath, source: definition.id, storage })
    }
  }
  return artifacts
}
