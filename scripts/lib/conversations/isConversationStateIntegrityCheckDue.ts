import { CONVERSATION_STATE_INTEGRITY_CHECK_INTERVAL_MS } from './constants/CONVERSATION_STATE_INTEGRITY_CHECK_INTERVAL_MS'

/**
 * Whether the state's last passed integrity check is too old to trust.
 *
 * A missing or unreadable stamp is due, and so is one dated in the future: a
 * clock that moved backwards must not postpone the check indefinitely.
 */
export const isConversationStateIntegrityCheckDue = (
  lastCheckedAt: string | undefined,
  now: number,
) => {
  if (lastCheckedAt === undefined) return true
  const checked = Date.parse(lastCheckedAt)
  if (Number.isNaN(checked) || checked > now) return true
  return now - checked >= CONVERSATION_STATE_INTEGRITY_CHECK_INTERVAL_MS
}
