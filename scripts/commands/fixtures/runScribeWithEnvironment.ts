import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Run `scribe <args>` in a child process with `environment` laid over this
 * one's; a variable set to undefined is removed from the child's environment.
 */
export const runScribeWithEnvironment = (
  environment: Readonly<Record<string, string | undefined>>,
  ...args: string[]
) => {
  const env = { ...process.env, ...environment }
  for (const [name, value] of Object.entries(environment))
    if (value === undefined) Reflect.deleteProperty(env, name)
  const run = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      fileURLToPath(new URL('../../bin/scribe.ts', import.meta.url)),
      ...args,
    ],
    { encoding: 'utf8', env },
  )
  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}
