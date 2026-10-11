import type { ScribeCommand } from './types/ScribeCommand'

/**
 * Every `scribe` subcommand, in help order. Loaded on demand so `scribe --help`
 * does not import the capture store, and each name is the suffix of the
 * `conversations:<name>` package script it replaces.
 */
export const SCRIBE_COMMANDS: Readonly<Record<string, ScribeCommand>> = {
  capture: {
    summary:
      'Capture what changed into the v2 segment store (the scheduled path)',
    load: () => import('./conversationsCapture'),
  },
  export: {
    summary: 'Export provider conversations to a canonical JSONL file',
    load: () => import('./conversationsExport'),
  },
  import: {
    summary: 'Merge an exported slice into the canonical archive',
    load: () => import('./conversationsImport'),
  },
  rewrite: {
    summary: 'One-off v1 repair: deduplicate provenance, redact home prefixes',
    load: () => import('./conversationsRewrite'),
  },
  render: {
    summary:
      'Render an archive into per-conversation files (--input, --output-dir)',
    load: () => import('./conversationsRender'),
  },
  doctor: {
    summary: 'Report provider discovery and capture readiness',
    load: () => import('./conversationsDoctor'),
  },
  'migrate-segments': {
    summary: 'Migrate a v1 archive into a v2 segment store',
    load: () => import('./conversationsMigrateSegments'),
  },
  'verify-segments': {
    summary: 'Verify a v2 segment store (--root)',
    load: () => import('./conversationsVerifySegments'),
  },
  'benchmark-segments': {
    summary: 'Acceptance benchmark of the segment format, synthetic data only',
    load: () => import('./conversationsBenchmarkSegments'),
  },
}
