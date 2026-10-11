import { claudeCodeLine } from './claudeCodeLine'

/** A slash-command echo: harness tags and nothing the person typed. */
export const CLAUDE_CODE_HARNESS_LINE = claudeCodeLine(
  '<command-message>review</command-message>\n<command-name>/review</command-name>\n<command-args>--fix</command-args>',
  '2026-08-19T08:00:25Z',
)
