/**
 * Bumped whenever a stored column stops meaning what it used to.
 *
 * The state database is disposable by design, so the cheap and correct
 * response to any mismatch is to delete it and replay the segments. That is
 * only safe while nothing canonical is kept here -- which is the reason this
 * number exists rather than a migration.
 */
// 2: materialized provenance paths are split, deduplicated and sorted, so a
// state that cached the joined form has to be replayed (2026-09-09).
// 3: fragments carry the hosts that observed them (2026-09-09).
// 4: materialized provenance paths are an array, not a joined string
// (2026-10-18).
// 5: events sharing a timestamp keep source order instead of event-id order,
// so a cached materialization is stale (2026-10-18).
// 6: source order decides over timestamps; time only orders events no fragment
// orders (2026-10-18).
export const CONVERSATION_ARCHIVE_STATE_SCHEMA_VERSION = 6
