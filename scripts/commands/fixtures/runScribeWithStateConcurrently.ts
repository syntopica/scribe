import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'

/**
 * Run `scribe <args>` against the state directory `state` without blocking, so
 * a test can change the freeze while the command waits; resolves with the exit
 * status and both streams.
 */
export const runScribeWithStateConcurrently = async (
  state: string,
  ...args: string[]
) => {
  const child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      fileURLToPath(new URL('../../bin/scribe.ts', import.meta.url)),
      ...args,
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ROCKET_AGENTS_CONVERSATION_STATE: state },
    },
  )
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    stdout += chunk
  })
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
    stderr += chunk
  })
  const [status] = (await once(child, 'close')) as [number | null]
  return { status, stdout, stderr }
}
