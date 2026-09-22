import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { readConversationArtifact } from './readConversationArtifact'
import { readSqliteConversationDocuments } from './readSqliteConversationDocuments'
import type { ConversationArtifact } from './types/ConversationArtifact'

void test('OpenCode SQLite capture joins sessions, messages, and parts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rocket-agents-opencode-'))
  const path = join(directory, 'opencode.db')
  const database = new DatabaseSync(path)
  database.exec(`
    CREATE TABLE session(id TEXT, title TEXT, directory TEXT, parent_id TEXT, time_created INTEGER, time_updated INTEGER);
    CREATE TABLE message(id TEXT, session_id TEXT, time_created INTEGER, data TEXT);
    CREATE TABLE part(id TEXT, message_id TEXT, time_created INTEGER, data TEXT);
  `)
  database
    .prepare('INSERT INTO session VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      'session-1',
      'OpenCode session',
      '/workspace',
      null,
      1_700_000_000_000,
      1_700_000_001_000,
    )
  database
    .prepare('INSERT INTO message VALUES (?, ?, ?, ?)')
    .run(
      'message-1',
      'session-1',
      1_700_000_000_000,
      JSON.stringify({ role: 'user' }),
    )
  database
    .prepare('INSERT INTO part VALUES (?, ?, ?, ?)')
    .run(
      'part-1',
      'message-1',
      1_700_000_000_000,
      JSON.stringify({ type: 'text', text: 'hello' }),
    )
  database.close()

  try {
    const artifact: ConversationArtifact = {
      path,
      relativePath: '.local/share/opencode/opencode.db',
      source: 'opencode',
      storage: 'sqlite',
    }
    const documents = readSqliteConversationDocuments(artifact)
    assert.equal(documents.length, 1)
    assert.match(documents[0]?.contents ?? '', /OpenCode session/u)
    assert.match(documents[0]?.contents ?? '', /hello/u)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('OpenCode desktop capture decodes bounded Tauri stores', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rocket-agents-tauri-'))
  const path = join(directory, 'store.dat')
  const key = Buffer.from('session:desktop-1')
  const value = Buffer.from(
    JSON.stringify({ messages: [{ role: 'user', content: 'desktop' }] }),
  )
  const keyLength = Buffer.alloc(4)
  const valueLength = Buffer.alloc(4)
  keyLength.writeUInt32LE(key.length)
  valueLength.writeUInt32LE(value.length)
  await writeFile(path, Buffer.concat([keyLength, key, valueLength, value]))

  try {
    const artifact: ConversationArtifact = {
      path,
      relativePath: '.local/share/ai.opencode.app/store.dat',
      source: 'opencode',
      storage: 'tauri',
    }
    const documents = await readConversationArtifact(artifact)
    assert.equal(documents.length, 1)
    assert.match(documents[0]?.contents ?? '', /desktop/u)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
