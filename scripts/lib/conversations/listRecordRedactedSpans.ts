import { listRedactedSpans } from './listRedactedSpans'
import { redactSensitiveText } from './redactSensitiveText'
import type { ConversationRecord } from './types/ConversationRecord'

/** The text the current redactor would take out of one record's title, workspace and events. */
export const listRecordRedactedSpans = (record: ConversationRecord) =>
  [
    record.title,
    record.workspace ?? '',
    ...record.events.map((event) => event.text),
  ].flatMap((text) => listRedactedSpans(text, redactSensitiveText(text).text))
