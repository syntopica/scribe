/**
 * How long a passed integrity check of the disposable state stays trusted.
 *
 * `PRAGMA integrity_check` reads the whole file. On the live 20 GB state it
 * took 96 s (2026-11-05), and every capture, export-pending, ack-pending and
 * inventory opens the state, so checking on every open spent about six of an
 * incremental refresh's eleven minutes re-reading 20 GB three or four times.
 * The state uses SQLite's default rollback journal, which survives a crash or
 * a killed process without corruption; the check is for damage on the medium,
 * and once a day finds that as surely as once a refresh.
 */
export const CONVERSATION_STATE_INTEGRITY_CHECK_INTERVAL_MS =
  24 * 60 * 60 * 1000
