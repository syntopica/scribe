/**
 * Tags Claude Code wraps around text it injects into a `user` line itself:
 * reminders, slash-command echoes, local command output and task
 * notifications. None of it was typed by the person.
 */
export const HARNESS_TAG_NAMES = [
  'system-reminder',
  'command-name',
  'command-message',
  'command-args',
  'command-contents',
  'local-command-stdout',
  'local-command-stderr',
  'local-command-caveat',
  'task-notification',
  'user-prompt-submit-hook',
] as const
