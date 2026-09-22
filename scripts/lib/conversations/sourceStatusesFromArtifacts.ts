import { resolveSourceDefinitions } from './resolveSourceDefinitions'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationSourceStatus } from './types/ConversationSourceStatus'

export const sourceStatusesFromArtifacts = (
  artifacts: ConversationArtifact[],
) => {
  const statuses: ConversationSourceStatus[] = []

  for (const definition of resolveSourceDefinitions(process.env)) {
    const matches = artifacts.filter(
      (artifact) => artifact.source === definition.id,
    )
    const available = matches.length > 0
    statuses.push({
      source: definition.id,
      available,
      artifacts: matches.length,
      files: matches.filter((artifact) => artifact.storage !== 'sqlite').length,
      databases: matches.filter((artifact) => artifact.storage === 'sqlite')
        .length,
      skipped: 0,
      ...(available
        ? {}
        : {
            reason:
              definition.id === 'treechat'
                ? 'no local Treechat export drop directory was found'
                : 'no supported local artifacts were found',
          }),
    })
  }

  return statuses
}
