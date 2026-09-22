/**
 * Raised when the archive on disk is no longer the revision that was merged.
 *
 * An import reads the archive, merges for as long as that takes, and writes
 * the result back. Another writer finishing in between would otherwise have
 * its conversations silently replaced by this one's older view. Refusing is
 * always safe; the caller re-reads and merges again.
 */
export class ConversationArchiveChangedError extends Error {
  readonly archive: string

  constructor(archive: string) {
    super(
      `the archive changed while it was being merged: ${archive}. ` +
        'Nothing was written. Re-run the import to merge against the new revision.',
    )
    this.archive = archive
    this.name = 'ConversationArchiveChangedError'
  }
}
