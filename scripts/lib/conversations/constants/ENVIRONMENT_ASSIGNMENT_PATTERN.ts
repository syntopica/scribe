/**
 * An upper-case variable assigned an unquoted or quoted value: `export
 * NAME_KEY=value`. The value ends at a backslash, which in captured text is
 * usually an escaped newline, and cannot start like a path, a shell expansion
 * or a placeholder (`/`, `~`, `.`, `$`, `<`, `{`, `(`): the archive held
 * `SECRETS=/Users/...` and `KEY=$(date ...` matches on 2026-11-06.
 */
export const ENVIRONMENT_ASSIGNMENT_PATTERN =
  /\b(?<name>[A-Z][A-Z0-9_]*) ?= ?(?<quote>["']?)(?<value>(?!\[REDACTED:)(?![$/~.<{(])[^\s"'`\\]{8,})/gu
