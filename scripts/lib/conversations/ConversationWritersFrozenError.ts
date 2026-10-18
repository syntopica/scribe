/**
 * Raised when a writer meets the migration freeze sentinel.
 *
 * Its exit code is EX_TEMPFAIL (75), distinct from a usage error (2) and a
 * failed run (1), so the dotfiles wrappers can tell "frozen, try later" from a
 * real failure without parsing stderr.
 */
export class ConversationWritersFrozenError extends Error {
  readonly sentinel: string
  readonly exitCode = 75

  constructor(sentinel: string) {
    super(
      `frozen: conversation writers are frozen while ${sentinel} exists; ` +
        'refusing to write. Unfreeze first, or pass --migration-frozen to a ' +
        'migration step that is meant to run inside the freeze.',
    )
    this.sentinel = sentinel
    this.name = 'ConversationWritersFrozenError'
  }
}
