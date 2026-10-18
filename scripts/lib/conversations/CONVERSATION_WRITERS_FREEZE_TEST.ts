import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { conversationFreezeSentinelPath } from './conversationFreezeSentinelPath'
import { conversationPathExists } from './conversationPathExists'
import { ConversationWritersFrozenError } from './ConversationWritersFrozenError'
import { exportConversations } from './exportConversations'
import { CONVERSATION_CAPTURE_FIXTURE_SOURCES } from './fixtures/CONVERSATION_CAPTURE_FIXTURE_SOURCES'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { exportConversationFixtureArchive } from './fixtures/exportConversationFixtureArchive'
import { scratchConversationState } from './fixtures/scratchConversationState'
import { writeClaudeConversationArtifact } from './fixtures/writeClaudeConversationArtifact'
import { migrateConversationArchiveToSegments } from './migrateConversationArchiveToSegments'
import { resolveConversationSegmentPaths } from './resolveConversationSegmentPaths'
import { withArchiveWriteLock } from './withArchiveWriteLock'

void test('a freeze that lands while a writer waits for the lock wins', async (context) => {
  const scratch = await scratchConversationState(context)
  const archive = join(scratch, 'archive')
  // Held by this live process, so the writer below queues behind it.
  await fs.writeFile(`${archive}.write-lock`, `${String(process.pid)}\n`)
  let published = false
  const writer = withArchiveWriteLock(archive, () => {
    published = true
    return Promise.resolve()
  })
  await delay(100)
  await fs.writeFile(join(scratch, 'migration.freeze'), '')
  await fs.rm(`${archive}.write-lock`)
  await assert.rejects(writer, ConversationWritersFrozenError)
  assert.equal(published, false)
  assert.equal(await conversationPathExists(`${archive}.write-lock`), false)

  assert.equal(
    await withArchiveWriteLock(archive, () => Promise.resolve(7), true),
    7,
  )
  await fs.rm(join(scratch, 'migration.freeze'))
  assert.equal(await withArchiveWriteLock(archive, () => Promise.resolve(8)), 8)
})

void test('an empty state override means unset and a relative one is refused', (context) => {
  const previous = process.env['ROCKET_AGENTS_CONVERSATION_STATE']
  context.after(() => {
    if (previous === undefined)
      delete process.env['ROCKET_AGENTS_CONVERSATION_STATE']
    else process.env['ROCKET_AGENTS_CONVERSATION_STATE'] = previous
  })
  process.env['ROCKET_AGENTS_CONVERSATION_STATE'] = ''
  assert.equal(
    conversationFreezeSentinelPath(),
    join(
      homedir(),
      '.local',
      'state',
      'rocket-agents',
      'conversations',
      'migration.freeze',
    ),
  )
  process.env['ROCKET_AGENTS_CONVERSATION_STATE'] = 'relative/state'
  assert.throws(() => conversationFreezeSentinelPath(), /must be an absolute/)
  process.env['ROCKET_AGENTS_CONVERSATION_STATE'] = '/srv/state'
  assert.equal(conversationFreezeSentinelPath(), '/srv/state/migration.freeze')
})

void test('a v1 export that meets a freeze at publication writes nothing', async (context) => {
  const state = await scratchConversationState(context)
  const home = await createConversationScratchDirectory(context, 'home-')
  await writeClaudeConversationArtifact({ home, session: 's1', turns: 2 })
  const output = join(home, 'out', 'archive.jsonl')
  // No command-level check runs here: only the one before the rename can stop it.
  await fs.writeFile(join(state, 'migration.freeze'), '')
  await assert.rejects(
    exportConversations(home, output, CONVERSATION_CAPTURE_FIXTURE_SOURCES),
    ConversationWritersFrozenError,
  )
  assert.deepEqual(await fs.readdir(join(home, 'out')), [])
})

void test('a migration that meets a freeze before activation selects nothing', async (context) => {
  const state = await scratchConversationState(context)
  const { archive } = await exportConversationFixtureArchive(context)
  const root = await createConversationScratchDirectory(context, 'migrated-')
  const reference = resolveConversationSegmentPaths(root).reference
  await fs.writeFile(join(state, 'migration.freeze'), '')
  const options = { archive, root, createdAt: '2026-10-18T00:00:00.000Z' }
  await assert.rejects(
    migrateConversationArchiveToSegments(options),
    ConversationWritersFrozenError,
  )
  assert.equal(await conversationPathExists(reference), false)

  await migrateConversationArchiveToSegments({
    ...options,
    migrationFrozen: true,
  })
  assert.equal(await conversationPathExists(reference), true)
})
