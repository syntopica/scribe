import type { ConversationArchiveState } from './ConversationArchiveState'

/**
 * Drop cache rows for artifacts the sources no longer offer, and nothing else.
 *
 * A rollout that Codex rotated away, a Cursor workspace that was deleted: the
 * conversations they produced stay in the archive forever, because outliving
 * the tools that wrote them is the reason the archive exists. Only the row
 * that says "I have already read this file" goes.
 */
export const forgetMissingConversationArtifacts = (
  state: ConversationArchiveState,
  seen: ReadonlySet<string>,
) => {
  let forgotten = 0
  for (const key of state.artifactKeys()) {
    if (seen.has(`${key.source} ${key.relativePath} ${key.storageKind}`)) {
      continue
    }
    state.forgetArtifact(key)
    forgotten++
  }
  return forgotten
}
