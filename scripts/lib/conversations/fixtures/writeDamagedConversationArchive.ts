import { join } from 'node:path'
import type { ConversationRecord } from '../types/ConversationRecord'
import { writeConversationExport } from '../writeConversationExport'
import { createConversationFragment } from './createConversationFragment'
import { createConversationScratchDirectory } from './createConversationScratchDirectory'

/**
 * A v1 archive as the memstore-era captures left it, plus one clean record.
 *
 * The leaked record names a real home in its title, its workspace and one
 * event, and carries a provenance path the old pairwise merge repeated on
 * every import - the two things the archive rewrite exists to repair.
 */
export const writeDamagedConversationArchive = async (context: {
  after: (cleanup: () => Promise<void>) => void
}) => {
  const home = '/Users/someone'
  const root = await createConversationScratchDirectory(
    context,
    'conversation-rewrite-',
  )
  const archive = join(root, 'archive.jsonl')
  const leaked = createConversationFragment({ id: 'leaked', events: 2 })
  const joinedPath = 'b.jsonl,a.jsonl,b.jsonl,a.jsonl,b.jsonl'
  const records: ConversationRecord[] = [
    {
      ...leaked,
      title: `${home}/p/app`,
      workspace: `${home}/p/app`,
      events: leaked.events.map((event, index) => ({
        ...event,
        text: index === 0 ? `cd ${home}/p/app` : event.text,
      })),
      hosts: ['peer-a'],
      provenance: { ...leaked.provenance, relativePath: joinedPath },
    },
    {
      ...createConversationFragment({ id: 'clean', events: 2 }),
      hosts: ['macbook'],
    },
  ]
  await writeConversationExport(records, archive)
  return { home, root, archive, records, joinedPath }
}
