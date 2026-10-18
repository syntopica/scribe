import { activateConversationArchiveGeneration } from '../activateConversationArchiveGeneration'
import { seedConversationArchiveGeneration } from '../seedConversationArchiveGeneration'
import type { TestCleanupContext } from '../types/TestCleanupContext'
import { createConversationScratchDirectory } from './createConversationScratchDirectory'
import { stageConversationGeneration } from './stageConversationGeneration'

/** A fresh installation seeded with `from`'s generation and activated on it. */
export const seedConversationInstallation = async (
  context: TestCleanupContext,
  from: string,
  generationId: string,
) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-installation-',
  )
  await seedConversationArchiveGeneration({
    root,
    from: await stageConversationGeneration(context, from, generationId),
    generationId,
  })
  await activateConversationArchiveGeneration({
    root,
    generationId,
    updatedAt: '2026-10-18T00:00:00.000Z',
  })
  return root
}
