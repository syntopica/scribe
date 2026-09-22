import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Where the disposable index lives when a command is not told otherwise.
 *
 * Under state, not under data: everything here can be deleted at any moment
 * and rebuilt from the segments, and putting it beside the archive would
 * invite a backup or a sync to carry a derived file between machines as though
 * it were part of the corpus.
 */
export const defaultConversationStatePath = (home = homedir()) =>
  join(
    process.env['XDG_STATE_HOME'] ?? join(home, '.local', 'state'),
    'rocket-agents',
    'conversations',
    'archive-index.sqlite3',
  )
