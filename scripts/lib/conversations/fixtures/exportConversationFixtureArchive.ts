import { join } from 'node:path'
import { exportConversations } from '../exportConversations'
import { CONVERSATION_CAPTURE_FIXTURE_SOURCES } from './CONVERSATION_CAPTURE_FIXTURE_SOURCES'
import { createConversationScratchDirectory } from './createConversationScratchDirectory'
import { writeClaudeConversationArtifact } from './writeClaudeConversationArtifact'

/** A home of synthetic sessions and the v1 archive file exported from it. */
export const exportConversationFixtureArchive = async (
  context: { after: (cleanup: () => Promise<void>) => void },
  sessions = ['s1', 's2', 's3', 's4', 's5'],
) => {
  const home = await createConversationScratchDirectory(
    context,
    'conversation-migration-',
  )
  for (const session of sessions) {
    await writeClaudeConversationArtifact({ home, session, turns: 4 })
  }
  const archive = join(home, 'archive.jsonl')
  const exported = await exportConversations(
    home,
    archive,
    CONVERSATION_CAPTURE_FIXTURE_SOURCES,
  )
  return { home, archive, exported }
}
