import assert from 'node:assert/strict'
import test from 'node:test'
import { CONVERSATION_SOURCES } from './constants/CONVERSATION_SOURCES'
import { isSupportedSourceArtifact } from './isSupportedSourceArtifact'
import { resolveSourceDefinitions } from './resolveSourceDefinitions'
import { sqliteConversationQuery } from './sqliteConversationQuery'

void test('the source catalog covers the union of both reference projects', () => {
  const definitions = resolveSourceDefinitions({})
  assert.deepEqual(
    definitions
      .map((source) => source.id)
      .toSorted((left, right) => left.localeCompare(right)),
    [...CONVERSATION_SOURCES].toSorted((left, right) =>
      left.localeCompare(right),
    ),
  )
  assert.equal(new Set(definitions.map((source) => source.id)).size, 13)
})

void test('Claude Code discovery covers every desktop profile that writes local-agent sessions', () => {
  const definition = resolveSourceDefinitions({}).find(
    ({ id }) => id === 'claude-code',
  )
  assert.ok(definition)
  assert.deepEqual(
    definition.roots.filter((root) =>
      root.endsWith('local-agent-mode-sessions'),
    ),
    [
      'Library/Application Support/Claude/local-agent-mode-sessions',
      'Library/Application Support/Claude-secondary/local-agent-mode-sessions',
    ],
  )
})

void test('SQLite extraction is restricted to known conversation-bearing tables', () => {
  assert.match(
    sqliteConversationQuery('ItemTable', 'trae') ?? '',
    /conversation/u,
  )
  assert.match(
    sqliteConversationQuery('part', 'opencode') ?? '',
    /SELECT rowid/u,
  )
  assert.equal(sqliteConversationQuery('cookies', 'cursor'), undefined)
  assert.equal(sqliteConversationQuery('auth', 'cursor'), undefined)
})

void test('OpenCode desktop discovery accepts only Tauri store files', () => {
  const definition = resolveSourceDefinitions({}).find(
    ({ id }) => id === 'opencode',
  )
  assert.ok(definition)
  assert.equal(
    isSupportedSourceArtifact(
      definition,
      '.local/share/ai.opencode.app',
      'tauri',
    ),
    true,
  )
  assert.equal(
    isSupportedSourceArtifact(
      definition,
      '.local/share/ai.opencode.app',
      'json',
    ),
    false,
  )
})
