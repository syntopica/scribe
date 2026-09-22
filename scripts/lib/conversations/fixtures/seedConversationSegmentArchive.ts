import { join } from 'node:path'
import { CONVERSATION_BASE_GENERATION_ID } from '../constants/CONVERSATION_BASE_GENERATION_ID'
import { initializeConversationArchiveGeneration } from '../initializeConversationArchiveGeneration'
import { readConversationArchiveGeneration } from '../readConversationArchiveGeneration'
import type { ConversationRecord } from '../types/ConversationRecord'
import { createConversationFragment } from './createConversationFragment'
import { createConversationScratchDirectory } from './createConversationScratchDirectory'
import { createConversationSegment } from './createConversationSegment'

/** An archive sealed with one base segment, plus the paths a test needs. */
export const seedConversationSegmentArchive = async (
  context: { after: (cleanup: () => Promise<void>) => void },
  fragments: ConversationRecord[] = [
    createConversationFragment({ id: 'c1', events: 3 }),
  ],
) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-state-',
  )
  await initializeConversationArchiveGeneration({
    root,
    baseSegments: [
      createConversationSegment(fragments, CONVERSATION_BASE_GENERATION_ID),
    ],
    createdAt: '2026-08-31T23:00:00.000Z',
  })
  return {
    root,
    ...(await readConversationArchiveGeneration(root)),
    statePath: join(root, 'state.sqlite3'),
  }
}
