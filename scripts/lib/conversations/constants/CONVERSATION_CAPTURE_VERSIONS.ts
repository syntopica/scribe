/**
 * The code versions a cached capture result is only valid under.
 *
 * A fingerprint says the bytes on disk did not change. It says nothing about
 * whether this build would still turn them into the same records -- a new
 * redaction pattern or a changed event-id rule produces different fragments
 * from identical input. Bumping the matching number here invalidates every
 * cached artifact and forces one honest full pass, which is cheap next to
 * shipping fragments that two builds disagree about.
 */
export const CONVERSATION_CAPTURE_VERSIONS = {
  normalizer: 2,
  // 2: the account home is redacted whatever root the capture was given, and
  // redaction is idempotent (2026-09-09).
  redactor: 2,
  // 2: a captured record names the host that read it, and a cache hit would
  // otherwise keep that host out of the archive forever (2026-09-09).
  adapter: 2,
}
