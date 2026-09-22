import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

/**
 * One capture in its own process, which is the only honest way to measure one.
 *
 * Resident memory never returns to the operating system inside a run, so a
 * seeding pass and the incremental pass after it cannot share a process and
 * still be compared: the second reports the first one's high-water mark. It
 * measured 574,898,176 bytes for a pass that read 1,608 bytes.
 *
 * A child process is also what the machine actually does. The hourly agent and
 * the SessionEnd hook each start a fresh one, so what is measured here is the
 * thing that runs rather than a shape the benchmark invented.
 */
export const runConversationCapturePass = async (options: {
  home: string
  root: string
  statePath: string
}) => {
  const repository = fileURLToPath(new URL('../../..', import.meta.url))
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/bin/run-conversations-capture.ts',
      '--home',
      options.home,
      '--root',
      options.root,
      '--state',
      options.statePath,
      '--source',
      'claude-code',
    ],
    { cwd: repository, maxBuffer: 64 * 1024 * 1024 },
  )
  return JSON.parse(stdout) as {
    elapsedSeconds: number
    peakRssBytes: number
    segments: { sha256: string; bytes: number; fragments: number }[]
    conversationsChanged: number
    metrics: {
      cacheHits: number
      fullyParsed: number
      fragmentsAppended: number
      payloadBytesRead: number
      recordsNormalized: number
    }
  }
}
