import { discoverConversationArtifacts } from './discoverConversationArtifacts'
import { sourceStatusesFromArtifacts } from './sourceStatusesFromArtifacts'
import type { ConversationSource } from './types/ConversationSource'

export const inspectConversationSources = async (
  home: string,
  selectedSources?: ReadonlySet<ConversationSource>,
) => {
  const artifacts = await discoverConversationArtifacts(home, selectedSources)
  const statuses = sourceStatusesFromArtifacts(artifacts).filter(
    (status) =>
      selectedSources === undefined || selectedSources.has(status.source),
  )
  return { artifacts, statuses }
}
