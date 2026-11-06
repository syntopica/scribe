import { listConversationStringFields } from './listConversationStringFields'
import type { ConversationFieldLeak } from './types/ConversationFieldLeak'
import type { ConversationFragmentEntry } from './types/ConversationFragmentEntry'

/** Every string field of one entry, at any depth, that `contains` accepts. */
export const listConversationFieldLeaks = (
  entry: ConversationFragmentEntry,
  contains: (text: string) => boolean,
): ConversationFieldLeak[] =>
  listConversationStringFields(entry, 'entry')
    .filter(({ text }) => contains(text))
    .map(({ path }) => ({ fragmentSha256: entry.fragmentSha256, field: path }))
