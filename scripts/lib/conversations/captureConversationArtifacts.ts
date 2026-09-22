import { captureConversationArtifact } from './captureConversationArtifact'
import { CONVERSATION_CAPTURE_CONCURRENCY } from './constants/CONVERSATION_CAPTURE_CONCURRENCY'
import { inspectConversationSources } from './inspectConversationSources'
import type { ConversationCaptureSummary } from './types/ConversationCaptureSummary'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationSource } from './types/ConversationSource'

export const captureConversationArtifacts = async (
  home: string,
  selectedSources: ReadonlySet<ConversationSource> | undefined,
  consume: (record: ConversationRecord) => void,
  host?: string,
): Promise<ConversationCaptureSummary> => {
  const { artifacts, statuses } = await inspectConversationSources(
    home,
    selectedSources,
  )
  const skipped: string[] = []

  for (
    let index = 0;
    index < artifacts.length;
    index += CONVERSATION_CAPTURE_CONCURRENCY
  ) {
    const batch = artifacts.slice(
      index,
      index + CONVERSATION_CAPTURE_CONCURRENCY,
    )
    for (const captured of await Promise.all(
      batch.map(async (artifact) =>
        host === undefined
          ? captureConversationArtifact(artifact, home)
          : captureConversationArtifact(artifact, home, host),
      ),
    )) {
      for (const record of captured.records) consume(record)
      if (captured.error === undefined) continue

      skipped.push(
        `${captured.source}:${captured.relativePath}: ${captured.error}`,
      )
      const status = statuses.find(
        (candidate) => candidate.source === captured.source,
      )
      if (status !== undefined) status.skipped++
    }
  }
  return { ok: skipped.length === 0, sources: statuses, skipped }
}
