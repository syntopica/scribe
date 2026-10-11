import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { archiveToolOutputAsUser as archived } from './fixtures/archiveToolOutputAsUser'
import { captureClaudeCodeLines as capture } from './fixtures/captureClaudeCodeLines'
import { CLAUDE_CODE_TOOL_OUTPUT_FOLLOW_UP as followUp } from './fixtures/CLAUDE_CODE_TOOL_OUTPUT_FOLLOW_UP'
import { CLAUDE_CODE_TOOL_OUTPUT_OPENING as opening } from './fixtures/CLAUDE_CODE_TOOL_OUTPUT_OPENING'
import { claudeCodeLine } from './fixtures/claudeCodeLine'
import { createConversationScratchDirectory } from './fixtures/createConversationScratchDirectory'
import { readStoredConversationRecords as stored } from './fixtures/readStoredConversationRecords'
import { materializeConversationFragmentSet } from './materializeConversationFragmentSet'
import { mergeConversationRecordFragments } from './mergeConversationRecordFragments'

void test('a Claude Code line holding only tool results is a tool message', () => {
  const record = capture([
    ...opening,
    claudeCodeLine(
      [
        { type: 'tool_result', tool_use_id: 'toolu_3', content: 'ok' },
        { type: 'text', text: 'and also this' },
      ],
      '2026-08-19T08:00:30Z',
    ),
  ])
  assert.deepEqual(
    record.events.map(({ kind, role }) => `${kind}/${role}`),
    ['message/user', 'message/assistant', 'message/tool', 'message/user'],
  )
})

void test('an archived tool-output event keeps its role when the conversation grows', () => {
  const before = archived(capture(opening))
  const after = capture([...opening, followUp])
  const expected = [
    'user:Why does the deploy fail?',
    'assistant:tool: Read',
    'user:1\texit 3',
    'tool:2\tset -e',
  ]

  for (const merged of [
    mergeConversationRecordFragments(before, after),
    mergeConversationRecordFragments(after, before),
    materializeConversationFragmentSet([after, before]).record,
  ]) {
    assert.deepEqual(
      merged.events.map(({ text, role }) => `${role}:${text}`),
      expected,
    )
  }
})

void test('recapturing an archived conversation under the new rule changes nothing', async (context) => {
  const root = await createConversationScratchDirectory(
    context,
    'conversation-tool-output-',
  )
  const store = new ConversationCaptureStore(join(root, 'capture.sqlite'))
  try {
    assert.equal(store.mergeFragment(archived(capture(opening))), 'added')
    const before = stored(store)

    // Unchanged source bytes: the provenance hash matches.
    assert.equal(store.mergeFragment(capture(opening)), 'duplicate')
    // Changed source bytes that add no event: only the role would differ.
    const touched = capture(opening)
    touched.provenance = { ...touched.provenance, contentSha256: 'touched' }
    assert.equal(store.mergeFragment(touched), 'duplicate')
    assert.deepEqual(stored(store), before)
  } finally {
    store.close()
  }
})
