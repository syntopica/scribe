/**
 * Run something and report how long it took and how much memory it held.
 *
 * Sampled on an interval rather than read at the edges, because the peak of a
 * capture happens while fragments are staged and a before/after reading finds
 * only the quiet moments on either side of it.
 *
 * RSS is a property of the process, not of the call: once a run has grown the
 * heap it does not shrink back, so a second measurement inside the same
 * process reports the first one's peak. Anything comparing passes must give
 * each one its own process, the way the scheduler does.
 */
export const withPeakRssSampling = async <T>(run: () => Promise<T>) => {
  let peakRssBytes = process.memoryUsage().rss
  const sampler = setInterval(() => {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss)
  }, 25)
  const startedAt = process.hrtime.bigint()
  try {
    const result = await run()
    return {
      result,
      elapsedSeconds: Number(process.hrtime.bigint() - startedAt) / 1e9,
      peakRssBytes: Math.max(peakRssBytes, process.memoryUsage().rss),
    }
  } finally {
    clearInterval(sampler)
  }
}
