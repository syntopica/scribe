import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Run `scribe <args>` in a child process, the way a person would. */
export const runScribe = (...args: string[]) => {
  const run = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      fileURLToPath(new URL('../../bin/scribe.ts', import.meta.url)),
      ...args,
    ],
    { encoding: 'utf8' },
  )
  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}
