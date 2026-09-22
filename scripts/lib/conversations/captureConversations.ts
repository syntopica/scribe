import { captureConversationArtifacts } from './captureConversationArtifacts'
import type { ConversationCaptureReport } from './types/ConversationCaptureReport'
import type { ConversationRecord } from './types/ConversationRecord'
import type { ConversationSource } from './types/ConversationSource'
import { upsertConversationRecordFragment } from './upsertConversationRecordFragment'

export const captureConversations = async (
  home: string,
  selectedSources?: ReadonlySet<ConversationSource>,
): Promise<ConversationCaptureReport> => {
  const records = new Map<string, ConversationRecord>()
  const summary = await captureConversationArtifacts(
    home,
    selectedSources,
    (record) => {
      upsertConversationRecordFragment(records, record)
    },
  )

  return {
    ...summary,
    records: [...records.values()].toSorted((left, right) =>
      left.id.localeCompare(right.id),
    ),
  }
}
