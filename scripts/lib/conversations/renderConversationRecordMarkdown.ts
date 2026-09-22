import { conversationEventHeading } from './conversationEventHeading'
import type { ConversationRecord } from './types/ConversationRecord'

export const renderConversationRecordMarkdown = (record: ConversationRecord) =>
  [
    `# ${record.title}`,
    '',
    `- Source: ${record.source}`,
    `- Source ID: ${record.sourceId}`,
    ...(record.workspace === undefined
      ? []
      : [`- Workspace: ${record.workspace}`]),
    ...(record.startedAt === undefined
      ? []
      : [`- Started: ${record.startedAt}`]),
    ...(record.updatedAt === undefined
      ? []
      : [`- Updated: ${record.updatedAt}`]),
    `- Content SHA-256: ${record.provenance.contentSha256}`,
    '',
    ...record.events.flatMap((event) => [
      conversationEventHeading(event),
      '',
      event.text,
      '',
    ]),
  ].join('\n')
