import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

/**
 * The migration freeze sentinel the dotfiles `conversation-writers freeze`
 * creates, resolved exactly the way `sync-conversations` resolves its state
 * directory: `${ROCKET_AGENTS_CONVERSATION_STATE:-$HOME/.local/state/rocket-agents/conversations}`,
 * so an empty value means unset.
 *
 * Fixed rather than derived from a command's `--state` or `--root`: a writer
 * that bypasses the wrappers must find the real sentinel without any flag, and
 * a flag that moved it would be a way around the freeze. `XDG_STATE_HOME` is
 * deliberately not consulted, because the dotfiles side does not consult it
 * and the two must name the same file. A relative override is refused rather
 * than resolved against whatever directory the writer happened to start in.
 * Tests point the variable at a scratch directory.
 */
export const conversationFreezeSentinelPath = () => {
  const override = process.env['ROCKET_AGENTS_CONVERSATION_STATE'] ?? ''
  if (override !== '' && !isAbsolute(override))
    throw new Error(
      `ROCKET_AGENTS_CONVERSATION_STATE must be an absolute path, got ${override}`,
    )
  return join(
    override === ''
      ? join(homedir(), '.local', 'state', 'rocket-agents', 'conversations')
      : override,
    'migration.freeze',
  )
}
