import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { benchmarkConversationSegments } from '../lib/conversations/benchmarkConversationSegments'
import { evaluateConversationSegmentBenchmark } from '../lib/conversations/evaluateConversationSegmentBenchmark'
import { flagValue } from '../lib/machine/cli/flagValue'

/**
 * The acceptance gate for the segment format, run on synthetic data only.
 *
 * Thresholds are passed in rather than hard-coded so the numbers being
 * defended stay in the command line that ran the check, next to the v1
 * baselines they are derived from. A pass here is not a claim about the live
 * archive; it is the evidence required before any command is pointed at it.
 */
export const main = async () => {
  const artifacts = Number(flagValue(process.argv, '--artifacts') ?? '1000')
  const changed = Number(flagValue(process.argv, '--changed') ?? '1')
  const baselineCaptureSeconds = Number(
    flagValue(process.argv, '--baseline-capture-seconds') ?? 'NaN',
  )
  const baselineImportSeconds = Number(
    flagValue(process.argv, '--baseline-import-seconds') ?? 'NaN',
  )

  if (!Number.isInteger(artifacts) || artifacts < 1) {
    console.error('--artifacts must be a positive integer')
    process.exitCode = 2
    return
  }
  if (!Number.isInteger(changed) || changed < 0 || changed > artifacts) {
    console.error('--changed must be between 0 and --artifacts')
    process.exitCode = 2
    return
  }

  const workspace = await fs.mkdtemp(
    join(tmpdir(), 'conversation-segment-benchmark-'),
  )
  try {
    const measured = await benchmarkConversationSegments({
      workspace,
      artifacts,
      changed,
    })
    const failures = evaluateConversationSegmentBenchmark({
      measured,
      changed,
      maxCaptureSeconds: Number(
        flagValue(process.argv, '--max-capture-seconds') ?? 'Infinity',
      ),
      maxImportSeconds: Number(
        flagValue(process.argv, '--max-import-seconds') ?? 'Infinity',
      ),
      maxRssBytes: Number(
        flagValue(process.argv, '--max-rss-bytes') ?? 'Infinity',
      ),
      requireWarmNoop: process.argv.includes('--require-warm-noop'),
      requireProportionalBytes: process.argv.includes(
        '--require-proportional-bytes',
      ),
    })

    console.log(
      JSON.stringify(
        {
          ok: failures.length === 0,
          ...measured,
          speedup: {
            capture: Number.isNaN(baselineCaptureSeconds)
              ? undefined
              : baselineCaptureSeconds / measured.passes.changed.seconds,
            import: Number.isNaN(baselineImportSeconds)
              ? undefined
              : baselineImportSeconds / measured.passes.added.seconds,
          },
          failures,
        },
        null,
        2,
      ),
    )
    if (failures.length > 0) process.exitCode = 1
  } finally {
    await fs.rm(workspace, { recursive: true, force: true })
  }
}
