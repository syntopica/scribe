import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { initializeConversationArchiveGeneration } from '../initializeConversationArchiveGeneration'
import { publishConversationCapture } from '../publishConversationCapture'
import { CONVERSATION_CAPTURE_FIXTURE_SOURCES } from './CONVERSATION_CAPTURE_FIXTURE_SOURCES'
import { createConversationScratchDirectory } from './createConversationScratchDirectory'

/**
 * A home, an empty generation, and a capture bound to both.
 *
 * An empty generation rather than a seeded one, because the case under test is
 * an installation that has never published: the first capture must be the
 * thing that fills it, and a fixture that pre-seeded fragments would hide a
 * cache that reported hits it had not earned.
 */
export const createConversationCaptureInstallation = async (context: {
  after: (cleanup: () => Promise<void>) => void
}) => {
  const home = await createConversationScratchDirectory(
    context,
    'conversation-incremental-',
  )
  const root = join(home, 'archive')
  await fs.mkdir(root, { recursive: true })
  await initializeConversationArchiveGeneration({
    root,
    baseSegments: [],
    createdAt: '2026-08-31T23:00:00.000Z',
  })
  return {
    home,
    root,
    statePath: join(home, 'state.sqlite3'),
    capture: async (createdAt: string) =>
      publishConversationCapture({
        home,
        root,
        statePath: join(home, 'state.sqlite3'),
        sources: CONVERSATION_CAPTURE_FIXTURE_SOURCES,
        createdAt,
      }),
  }
}
