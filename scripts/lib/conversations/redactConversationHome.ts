import { sep } from 'node:path'
import type { ConversationRecord } from './types/ConversationRecord'

export const redactConversationHome = (
  record: ConversationRecord,
  home: string,
): ConversationRecord => {
  const redact = (value: string) =>
    value.split(home).join('[HOME]').replaceAll('[HOME]\\', `[HOME]${sep}`)
  return {
    ...record,
    title: redact(record.title),
    events: record.events.map((event) => ({
      ...event,
      text: redact(event.text),
    })),
    ...(record.workspace === undefined
      ? {}
      : { workspace: redact(record.workspace) }),
  }
}
