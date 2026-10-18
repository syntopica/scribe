import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Run `scribe erase <args>` in a child process, the way a person would. */
export const runScribeErase = (...args: string[]) => {
  const run = spawnSync(
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
    { encoding: 'utf8' },
  )
  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}
