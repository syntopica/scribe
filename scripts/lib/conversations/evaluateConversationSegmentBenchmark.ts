import type { benchmarkConversationSegments } from './benchmarkConversationSegments'

/**
 * Turn a measurement into a verdict against the thresholds it was run under.
 *
 * Separate from the measuring so the numbers can be recorded once and judged
 * against different bounds later -- the v1 baselines came from a machine and a
 * corpus that will both change, and re-running a 25,000-artifact fixture to
 * ask a different question about the same run is waste.
 */
export const evaluateConversationSegmentBenchmark = (options: {
  measured: Awaited<ReturnType<typeof benchmarkConversationSegments>>
  changed: number
  maxCaptureSeconds: number
  maxImportSeconds: number
  maxRssBytes: number
  requireWarmNoop: boolean
  requireProportionalBytes: boolean
}) => {
  const { measured } = options
  const failures: string[] = []
  const warm = measured.passes.warm
  if (
    options.requireWarmNoop &&
    (warm.payloadBytesRead !== 0 ||
      warm.recordsNormalized !== 0 ||
      warm.fragmentsAppended !== 0 ||
      warm.wroteSegment)
  ) {
    failures.push(`warm capture was not a no-op: ${JSON.stringify(warm)}`)
  }

  const changedPass = measured.passes.changed
  if (options.requireProportionalBytes) {
    if (changedPass.payloadBytesRead !== measured.changedArtifactBytes) {
      failures.push(
        `changed capture read ${String(changedPass.payloadBytesRead)} bytes for ${String(measured.changedArtifactBytes)} changed bytes`,
      )
    }
    if (changedPass.fullyParsed !== options.changed) {
      failures.push(
        `changed capture parsed ${String(changedPass.fullyParsed)} artifacts for ${String(options.changed)} changed`,
      )
    }
  }
  if (!measured.existingSegmentsUnchanged) {
    failures.push('an already published segment changed size')
  }
  if (changedPass.seconds > options.maxCaptureSeconds) {
    failures.push(
      `changed capture took ${changedPass.seconds.toFixed(3)}s against a ${String(options.maxCaptureSeconds)}s bound`,
    )
  }
  if (measured.passes.added.seconds > options.maxImportSeconds) {
    failures.push(
      `publishing one conversation took ${measured.passes.added.seconds.toFixed(3)}s against a ${String(options.maxImportSeconds)}s bound`,
    )
  }
  // The RSS bound belongs to the changed pass. A cold seeding pass stages and
  // writes the whole corpus once, and holding it to the cost of an incremental
  // refresh would measure the migration instead of the refresh.
  if (changedPass.peakRssBytes > options.maxRssBytes) {
    failures.push(
      `peak RSS ${String(changedPass.peakRssBytes)} exceeded ${String(options.maxRssBytes)}`,
    )
  }
  return failures
}
