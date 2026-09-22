import { objectAt } from './objectAt'
import { stringAt } from './stringAt'
import type { ConversationEventKind } from './types/ConversationEventKind'

export const conversationEventKindFromRecord = (
  record: unknown,
): ConversationEventKind => {
  const payload = objectAt(record, 'payload')
  const candidate =
    `${stringAt(record, 'type') ?? ''} ${stringAt(record, 'kind') ?? ''} ${stringAt(payload, 'type') ?? ''}`.toLowerCase()
  if (
    candidate.includes('tool_result') ||
    candidate.includes('tool-result') ||
    candidate.includes('function_call_output')
  )
    return 'tool-result'
  if (
    candidate.includes('tool_use') ||
    candidate.includes('tool-call') ||
    candidate.includes('function_call')
  )
    return 'tool-call'
  if (candidate.includes('reasoning') || candidate.includes('thinking'))
    return 'reasoning'
  if (candidate.includes('summary') || candidate.includes('compact'))
    return 'summary'
  if (candidate.includes('meta')) return 'metadata'
  return 'message'
}
