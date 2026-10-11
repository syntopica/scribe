import { spawnSync } from 'node:child_process'

/**
 * The id of a process that has already exited: it names nobody, as the pid in
 * an interrupted publication's temporary name does.
 */
export const exitedProcessId = () => spawnSync(process.execPath, ['-e', '']).pid
