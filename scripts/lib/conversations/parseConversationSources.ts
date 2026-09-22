import { CONVERSATION_SOURCES } from './constants/CONVERSATION_SOURCES'
import { isConversationSource } from './isConversationSource'
import type { ConversationSource } from './types/ConversationSource'

export const parseConversationSources = (values: string[]) => {
  const requested = values
    .flatMap((value) => value.split(','))
    .filter((value) => value !== '')
  if (requested.length === 0) return { sources: undefined, errors: [] }

  const errors = requested
    .filter((value) => !isConversationSource(value))
    .map(
      (value) =>
        `unsupported source '${value}'; expected one of ${CONVERSATION_SOURCES.join(', ')}`,
    )
  const sources = new Set<ConversationSource>(
    requested.filter(isConversationSource),
  )
  return { sources, errors }
}
