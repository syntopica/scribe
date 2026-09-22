import { captureConversationArtifact } from './captureConversationArtifact'
import { CONVERSATION_CAPTURE_CONCURRENCY } from './constants/CONVERSATION_CAPTURE_CONCURRENCY'
import type { ConversationArchiveState } from './ConversationArchiveState'
import { conversationArtifactCacheHit } from './conversationArtifactCacheHit'
import { conversationArtifactFingerprintsEqual } from './conversationArtifactFingerprintsEqual'
import { conversationArtifactKey } from './conversationArtifactKey'
import { conversationCaptureVersionStamp } from './conversationCaptureVersionStamp'
import { conversationHostLabel } from './conversationHostLabel'
import { fingerprintConversationArtifact } from './fingerprintConversationArtifact'
import { forgetMissingConversationArtifacts } from './forgetMissingConversationArtifacts'
import { inspectConversationSources } from './inspectConversationSources'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationArtifactFingerprint } from './types/ConversationArtifactFingerprint'
import type { ConversationIncrementalCaptureMetrics } from './types/ConversationIncrementalCaptureMetrics'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationSource } from './types/ConversationSource'

/**
 * Capture only the artifacts that changed, and prove the rest did not.
 *
 * The v1 pass read all 23,606 conversations every hour: 226.91 seconds and
 * 2.78 GB of output for a corpus where almost nothing had moved. Publication
 * alone would not have fixed that. The expensive half is upstream of the
 * archive, in parsing and redacting files whose bytes are identical to the
 * ones parsed an hour ago.
 *
 * What a cache hit requires is in `conversationArtifactCacheHit`. What happens
 * on a miss is here, and it is deliberately the whole artifact: suffix resume
 * for JSONL is only worth its correctness surface if measurement shows the
 * changed-artifact case missing its threshold, and at 25,000 artifacts it does
 * not.
 */
export const captureConversationArtifactsIncrementally = async (options: {
  home: string
  sources: ReadonlySet<ConversationSource> | undefined
  state: ConversationArchiveState
  generationId: string
  host?: string
  onArtifact: (capture: {
    key: { source: string; relativePath: string; storageKind: string }
    fingerprint: ConversationArtifactFingerprint | undefined
    records: ConversationRecord[]
  }) => Promise<void> | void
}): Promise<ConversationIncrementalCaptureMetrics> => {
  const { artifacts, statuses } = await inspectConversationSources(
    options.home,
    options.sources,
  )
  const host = options.host ?? conversationHostLabel()
  const captureVersions = conversationCaptureVersionStamp(host)
  const seen = new Set<string>()
  const skipped: string[] = []
  const metrics = {
    discovered: artifacts.length,
    statted: 0,
    cacheHits: 0,
    fullyParsed: 0,
    unreadable: 0,
    unstableReads: 0,
    payloadBytesRead: 0,
    recordsNormalized: 0,
  }

  const fail = (source: string, relativePath: string, message: string) => {
    skipped.push(`${source}:${relativePath}: ${message}`)
    const status = statuses.find((candidate) => candidate.source === source)
    if (status !== undefined) status.skipped++
  }

  const select = async (batch: ConversationArtifact[]) => {
    const fingerprints = await Promise.all(
      batch.map(async (artifact) => fingerprintConversationArtifact(artifact)),
    )
    metrics.statted += batch.length
    const changed: {
      artifact: ConversationArtifact
      before: ConversationArtifactFingerprint
    }[] = []
    for (const [position, artifact] of batch.entries()) {
      const key = conversationArtifactKey(artifact)
      seen.add(`${key.source} ${key.relativePath} ${key.storageKind}`)
      const before = fingerprints[position]
      if (before === undefined) {
        metrics.unreadable++
        fail(artifact.source, artifact.relativePath, 'artifact is unreadable')
        continue
      }
      if (
        conversationArtifactCacheHit({
          state: options.state,
          key,
          fingerprint: before,
          generationId: options.generationId,
          captureVersions,
        })
      ) {
        metrics.cacheHits++
        continue
      }
      changed.push({ artifact, before })
    }
    return changed
  }

  for (
    let index = 0;
    index < artifacts.length;
    index += CONVERSATION_CAPTURE_CONCURRENCY
  ) {
    const changed = await select(
      artifacts.slice(index, index + CONVERSATION_CAPTURE_CONCURRENCY),
    )
    const captures = await Promise.all(
      changed.map(async ({ artifact }) =>
        captureConversationArtifact(artifact, options.home, host),
      ),
    )
    for (const [position, captured] of captures.entries()) {
      const entry = changed[position]
      if (entry === undefined) continue
      metrics.fullyParsed++
      metrics.payloadBytesRead += Number(entry.before.size)
      if (captured.error !== undefined) {
        fail(captured.source, captured.relativePath, captured.error)
        continue
      }
      // Fingerprint again after reading. A file rewritten while it was being
      // parsed produced records that describe neither version, so its cache
      // row is withheld and the next pass reads it again.
      const stable = conversationArtifactFingerprintsEqual(
        entry.before,
        await fingerprintConversationArtifact(entry.artifact),
      )
      if (!stable) metrics.unstableReads++
      metrics.recordsNormalized += captured.records.length
      await options.onArtifact({
        key: conversationArtifactKey(entry.artifact),
        fingerprint: stable ? entry.before : undefined,
        records: captured.records,
      })
    }
  }

  return {
    ok: skipped.length === 0,
    ...metrics,
    forgottenArtifacts: forgetMissingConversationArtifacts(options.state, seen),
    sources: statuses,
    skipped,
  }
}
