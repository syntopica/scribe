import { listConversationStringFields } from './listConversationStringFields'
import type { ConversationFieldLeak } from './types/ConversationFieldLeak'
import type { ConversationFragmentEntry } from './types/ConversationFragmentEntry'

/** Every string field of one entry, at any depth, that contains any of `needles`. */
export const listConversationFieldLeaks = (
  entry: ConversationFragmentEntry,
  needles: readonly string[],
): ConversationFieldLeak[] =>
  listConversationStringFields(entry, 'entry')
    .filter(({ text }) => needles.some((needle) => text.includes(needle)))
    .map(({ path }) => ({ fragmentSha256: entry.fragmentSha256, field: path }))
