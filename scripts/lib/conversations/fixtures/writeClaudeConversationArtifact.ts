import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/**
 * One Claude Code session file inside a throwaway home.
 *
 * Capture tests need real artifacts on a real filesystem, because what they
 * assert is filesystem behaviour: nanosecond timestamps, inode reuse, and
 * whether a rewritten file of the same length is noticed. A stubbed reader
 * would agree with every one of those tests and none of the failures.
 */
export const writeClaudeConversationArtifact = async (options: {
  home: string
  session: string
  turns: number
}) => {
  const directory = join(options.home, '.claude', 'projects', 'fixture')
  await fs.mkdir(directory, { recursive: true })
  const path = join(directory, `${options.session}.jsonl`)
  const lines = Array.from({ length: options.turns }, (_, index) =>
    JSON.stringify({
      type: index % 2 === 0 ? 'user' : 'assistant',
      sessionId: options.session,
      timestamp: new Date(Date.UTC(2026, 7, 31, 0, 0, index)).toISOString(),
      cwd: join(options.home, 'p', 'fixture'),
      message: {
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `turn ${String(index)} of ${options.session}`,
      },
    }),
  )
  await fs.writeFile(path, `${lines.join('\n')}\n`)
  return path
}
