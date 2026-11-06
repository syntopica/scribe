/** An upper-case variable assigned an unquoted or quoted value: `export NAME_KEY=value`. */
export const ENVIRONMENT_ASSIGNMENT_PATTERN =
  /\b(?<name>[A-Z][A-Z0-9_]*) ?= ?(?<quote>["']?)(?<value>(?!\[REDACTED:)[^\s"'`]{8,})/gu
