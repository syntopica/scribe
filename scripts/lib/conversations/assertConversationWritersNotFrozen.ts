import { conversationFreezeSentinelPath } from './conversationFreezeSentinelPath'
import { conversationPathExists } from './conversationPathExists'
import { ConversationWritersFrozenError } from './ConversationWritersFrozenError'

/**
 * Refuse to write while the migration freeze sentinel exists.
 *
 * Called by every writing command before it does anything, and again by the
 * archive write lock once it is held, so a freeze that lands while a writer
 * waits for the lock still wins. `migrationFrozen` is the explicit
 * `--migration-frozen` of a step the cutover runs inside the freeze (import,
 * migrate, seed, receive, erase); provider capture never passes it.
 */
export const assertConversationWritersNotFrozen = async (
  migrationFrozen = false,
) => {
  if (migrationFrozen) return
  const sentinel = conversationFreezeSentinelPath()
  if (await conversationPathExists(sentinel))
    throw new ConversationWritersFrozenError(sentinel)
}
