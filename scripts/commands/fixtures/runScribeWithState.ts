import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Run `scribe <args>` in a child process whose conversation state directory,
 * and so its migration freeze sentinel, is `state` instead of the real one.
 */
export const runScribeWithState = (state: string, ...args: string[]) => {
  const run = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      fileURLToPath(new URL('../../bin/scribe.ts', import.meta.url)),
      ...args,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, ROCKET_AGENTS_CONVERSATION_STATE: state },
    },
  )
  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}
