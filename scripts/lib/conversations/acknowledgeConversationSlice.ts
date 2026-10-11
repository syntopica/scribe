import { openConversationSegmentState } from './openConversationSegmentState'
import { streamConversationExport } from './streamConversationExport'
import type { AcknowledgeConversationSliceOptions } from './types/AcknowledgeConversationSliceOptions'
import { upgradeConversationRecord } from './upgradeConversationRecord'

/**
 * Clear the pending deliveries a slice Atrium ingested has satisfied.
 *
 * A conversation is cleared only when the slice carries exactly the record the
 * archive materializes for it now. One captured again after the slice was
 * written stays pending, so the next refresh delivers the newer record rather
 * than losing it behind an acknowledgement for the older one. The same rule
 * makes a full export a valid acknowledgement for every conversation it holds.
 */
export const acknowledgeConversationSlice = async (
  options: AcknowledgeConversationSliceOptions,
) => {
  const { state } = await openConversationSegmentState(options)
  try {
    const pending = new Set(state.pendingDeliveries())
    const delivered: string[] = []
    const stale: string[] = []
    const streamed = await streamConversationExport(options.slice, (record) => {
      if (!pending.has(record.id)) return
      const current = state.conversation(record.id)
      const matches =
        current !== undefined &&
        JSON.stringify(upgradeConversationRecord(current)) ===
          JSON.stringify(upgradeConversationRecord(record))
      if (matches) delivered.push(record.id)
      else stale.push(record.id)
    })
    if (streamed.errors.length > 0) {
      throw new Error(
        `the slice is not a readable export: ${streamed.errors.join('; ')}`,
      )
    }
    state.clearPendingDeliveries(delivered)
    return {
      acknowledged: delivered.toSorted((left, right) =>
        left.localeCompare(right),
      ),
      stillPending: state.pendingDeliveries(),
      stale: stale.toSorted((left, right) => left.localeCompare(right)),
    }
  } finally {
    state.close()
  }
}
