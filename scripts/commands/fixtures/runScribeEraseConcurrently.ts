import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'

/**
 * Run `scribe erase <args>` in a child process without blocking, so a test can
 * race two of them; resolves with the exit status and both streams.
 */
export const runScribeEraseConcurrently = async (...args: string[]) => {
  const child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      fileURLToPath(new URL('../../bin/scribe.ts', import.meta.url)),
      'erase',
      ...args,
      '--now',
      '2026-10-18T00:00:00.000Z',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
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
