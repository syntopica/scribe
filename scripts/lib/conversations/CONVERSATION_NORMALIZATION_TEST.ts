import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { conversationRecordFromDocument } from './conversationRecordFromDocument'
import { hashText } from './hashText'
import { mergeConversationRecordFragments } from './mergeConversationRecordFragments'
import { readSqliteConversationDocuments } from './readSqliteConversationDocuments'
import { streamJsonlConversationRecord } from './streamJsonlConversationRecord'
import type { ConversationArtifact } from './types/ConversationArtifact'
import type { ConversationRecord } from './types/ConversationRecord'
import { upgradeConversationRecord } from './upgradeConversationRecord'

void test('VS Code-family adapters normalize tabbed chat data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rocket-agents-windsurf-'))
  const path = join(directory, 'state.vscdb')
  const database = new DatabaseSync(path)
  database.exec('CREATE TABLE ItemTable(key TEXT PRIMARY KEY, value TEXT)')
  database.prepare('INSERT INTO ItemTable VALUES (?, ?)').run(
    'cascade.chatdata',
    JSON.stringify({
      tabs: [
        {
          bubbles: [
            { type: 1, rawText: 'question' },
            { type: 2, text: 'answer' },
          ],
        },
      ],
    }),
  )
  database.close()

  try {
    const artifact: ConversationArtifact = {
      path,
      relativePath: 'Windsurf/User/workspaceStorage/test/state.vscdb',
      source: 'windsurf',
      storage: 'sqlite',
    }
    const [document] = readSqliteConversationDocuments(artifact)
    assert.ok(document)
    const record = conversationRecordFromDocument(document)
    assert.deepEqual(
      record?.events.map(({ role, text }) => ({ role, text })),
      [
        { role: 'user', text: 'question' },
        { role: 'assistant', text: 'answer' },
      ],
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('editor UI state is not exported as a conversation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rocket-agents-trae-'))
  const path = join(directory, 'state.vscdb')
  const database = new DatabaseSync(path)
  database.exec('CREATE TABLE ItemTable(key TEXT PRIMARY KEY, value TEXT)')
  const insert = database.prepare('INSERT INTO ItemTable VALUES (?, ?)')
  // Observed on 2026-08-31: the mention picker's selected item ids matched the
  // `%chat%` key filter and shipped as a two-event conversation.
  insert.run(
    'icube-ai-chat-storage-mention-search-selected-itemIds',
    JSON.stringify(['rule', 'code']),
  )
  insert.run(
    'workbench.panel.aichat.chatdata',
    JSON.stringify({ messages: [{ role: 'user', text: 'real question' }] }),
  )
  database.close()

  try {
    const artifact: ConversationArtifact = {
      path,
      relativePath: 'Trae/User/workspaceStorage/test/state.vscdb',
      source: 'trae',
      storage: 'sqlite',
    }
    const documents = readSqliteConversationDocuments(artifact)
    const texts = documents
      .map((document) => conversationRecordFromDocument(document))
      .flatMap((record) => record?.events.map(({ text }) => text) ?? [])
    assert.deepEqual(texts, ['real question'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('conversation fragments with the same source session retain every event', () => {
  const first = conversationRecordFromDocument({
    contents: JSON.stringify({
      sessionID: 'session-1',
      role: 'user',
      text: 'first',
    }),
    relativePath: 'part/first.json',
    source: 'opencode',
    sourceIdHint: 'first',
  })
  const second = conversationRecordFromDocument({
    contents: JSON.stringify({
      sessionID: 'session-1',
      role: 'assistant',
      text: 'second',
    }),
    relativePath: 'part/second.json',
    source: 'opencode',
    sourceIdHint: 'second',
  })
  assert.ok(first)
  assert.ok(second)
  // Sorted, not asserted in fragment order: events carrying no timestamp are
  // ordered by id, which is deliberately arbitrary but stable, and the point
  // of the merge is that neither side is dropped.
  assert.deepEqual(
    mergeConversationRecordFragments(first, second)
      .events.map(({ text }) => text)
      .toSorted((left, right) => left.localeCompare(right)),
    ['first', 'second'],
  )
})

void test('streamed JSONL normalizes to the same record as the whole document', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rocket-agents-jsonl-'))
  const path = join(directory, 'rollout.jsonl')
  const lines = [
    JSON.stringify({
      type: 'session_meta',
      id: 'session-9',
      cwd: '/workspace/project',
    }),
    '',
    JSON.stringify({
      role: 'user',
      text: 'first',
      timestamp: '2026-08-19T10:00:00Z',
    }),
    JSON.stringify({
      session_id: 'ignored',
      role: 'assistant',
      text: 'second',
    }),
  ]
  // A BOM in front of the first record: valid JSONL that the whole-document
  // path accepts, and that the streaming path has to accept identically.
  const contents = `\uFEFF${lines.join('\n')}\n`
  await writeFile(path, contents, 'utf8')

  try {
    const artifact: ConversationArtifact = {
      path,
      relativePath: 'sessions/rollout.jsonl',
      source: 'codex',
      storage: 'jsonl',
    }
    const streamed = await streamJsonlConversationRecord(artifact)
    const whole = conversationRecordFromDocument({
      contents,
      relativePath: artifact.relativePath,
      source: artifact.source,
      sourceIdHint: artifact.relativePath,
    })
    assert.ok(streamed)
    assert.deepEqual(streamed, whole)
    assert.equal(streamed.sourceId, 'session-9')
    assert.equal(streamed.workspace, '/workspace/project')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

void test('the same first message in two conversations no longer shares an event id', () => {
  const opening = JSON.stringify({
    sessionID: 'session-a',
    role: 'user',
    text: 'hello',
  })
  const first = conversationRecordFromDocument({
    contents: opening,
    relativePath: 'a.json',
    source: 'opencode',
    sourceIdHint: 'a',
  })
  const second = conversationRecordFromDocument({
    contents: opening.replace('session-a', 'session-b'),
    relativePath: 'b.json',
    source: 'opencode',
    sourceIdHint: 'b',
  })
  assert.ok(first)
  assert.ok(second)
  assert.notEqual(first.id, second.id)
  assert.equal(first.events[0]?.text, second.events[0]?.text)
  // The collision this fixes: index 0 plus identical text used to be the whole
  // id, so two unrelated conversations opening the same way collided.
  assert.notEqual(first.events[0]?.id, second.events[0]?.id)
})

void test('a version 1 fragment keeps its events when it meets a version 2 capture', () => {
  const legacy = conversationRecordFromDocument({
    contents: JSON.stringify({
      sessionID: 'session-1',
      role: 'user',
      text: 'legacy',
    }),
    relativePath: 'legacy.json',
    source: 'opencode',
    sourceIdHint: 'legacy',
  })
  assert.ok(legacy)
  const current = conversationRecordFromDocument({
    contents: JSON.stringify({
      sessionID: 'session-1',
      role: 'assistant',
      text: 'current',
    }),
    relativePath: 'current.json',
    source: 'opencode',
    sourceIdHint: 'current',
  })
  assert.ok(current)

  // The rule that would have dropped 'legacy' - letting the newer capture
  // supersede the older record - loses every event whose source file has since
  // been rotated away. Upgrading instead keeps both.
  const merged = mergeConversationRecordFragments(
    { ...legacy, schemaVersion: 1 },
    current,
  )
  assert.equal(merged.schemaVersion, 2)
  assert.deepEqual(
    merged.events
      .map(({ text }) => text)
      .toSorted((left, right) => left.localeCompare(right)),
    ['current', 'legacy'],
  )
  // Commutative, whichever side the legacy fragment arrives on.
  assert.deepEqual(
    mergeConversationRecordFragments({ ...legacy, schemaVersion: 1 }, current),
    mergeConversationRecordFragments(current, { ...legacy, schemaVersion: 1 }),
  )
})

void test('upgrading a version 1 record reproduces a fresh capture exactly', () => {
  const contents = JSON.stringify({
    sessionID: 'session-7',
    role: 'user',
    text: 'shared',
  })
  const captured = conversationRecordFromDocument({
    contents,
    relativePath: 'x.json',
    source: 'opencode',
    sourceIdHint: 'x',
  })
  assert.ok(captured)

  // What the same document produced before 2026-08-31: the identical record
  // with unqualified event ids.
  const legacy: ConversationRecord = {
    ...captured,
    schemaVersion: 1,
    events: captured.events.map((event, index) => ({
      ...event,
      id: hashText(`${String(index)}\0${event.text}`),
    })),
  }

  const upgraded = upgradeConversationRecord(legacy)
  assert.deepEqual(upgraded, captured)
  // So an archive holding both loses nothing when they meet.
  assert.deepEqual(
    mergeConversationRecordFragments(legacy, captured).events,
    captured.events,
  )
})
