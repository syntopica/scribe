import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { readSqliteConversationDocuments } from './readSqliteConversationDocuments'
import type { ConversationArtifact } from './types/ConversationArtifact'

void test('Cursor SQLite capture groups current and legacy conversation storage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rocket-agents-cursor-'))
  const path = join(directory, 'state.vscdb')
  const database = new DatabaseSync(path)
  database.exec(
    'CREATE TABLE cursorDiskKV(key TEXT PRIMARY KEY, value TEXT); CREATE TABLE ItemTable(key TEXT PRIMARY KEY, value TEXT)',
  )
  const insertCurrent = database.prepare(
    'INSERT INTO cursorDiskKV(key, value) VALUES (?, ?)',
  )
  insertCurrent.run(
    'composerData:session-1',
    JSON.stringify({
      name: 'Current session',
      conversation: [{ type: 1, text: 'inline' }],
    }),
  )
  insertCurrent.run(
    'bubbleId:session-1:bubble-1',
    JSON.stringify({
      type: 'assistant',
      text: 'separate',
      toolResults: ['done'],
    }),
  )
  database
    .prepare('INSERT INTO ItemTable(key, value) VALUES (?, ?)')
    .run('aiService.prompts', JSON.stringify([{ prompt: 'legacy' }]))
  database.close()

  try {
    const artifact: ConversationArtifact = {
      path,
      relativePath: 'Cursor/User/workspaceStorage/test/state.vscdb',
      source: 'cursor',
      storage: 'sqlite',
    }
    const documents = readSqliteConversationDocuments(artifact)
    assert.equal(documents.length, 2)
    assert.match(documents[0]?.contents ?? '', /inline/u)
    assert.match(documents[0]?.contents ?? '', /separate/u)
    assert.match(documents[1]?.contents ?? '', /legacy/u)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
