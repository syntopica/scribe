import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'
import { ConversationCaptureStore } from './ConversationCaptureStore'
import { archiveReclassifiedRolesAsUser as archived } from './fixtures/archiveReclassifiedRolesAsUser'
import { captureClaudeCodeLines as capture } from './fixtures/captureClaudeCodeLines'
import { CLAUDE_CODE_HARNESS_LINE as harness } from './fixtures/CLAUDE_CODE_HARNESS_LINE'
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

void test('a Claude Code line of harness tags alone is a system message', () => {
  const record = capture([
    harness,
    claudeCodeLine(
      '<system-reminder>\nThe date is 2026-10-11.\n</system-reminder>',
      '2026-08-19T08:00:26Z',
    ),
    claudeCodeLine(
      '<local-command-stdout>Compacted</local-command-stdout>',
      '2026-08-19T08:00:27Z',
    ),
  ])
  assert.deepEqual(
    record.events.map(({ kind, role }) => `${kind}/${role}`),
    ['message/system', 'message/system', 'message/system'],
  )
})

void test("a real prompt with a system reminder appended stays the user's", () => {
  const record = capture([
    claudeCodeLine(
      'Fix the deploy script.\n\n<system-reminder>\nThe date is 2026-10-11.\n</system-reminder>',
      '2026-08-19T08:00:00Z',
    ),
    claudeCodeLine(
      [
        { type: 'text', text: 'And run the tests.' },
        { type: 'text', text: '<system-reminder>Plan mode.</system-reminder>' },
      ],
      '2026-08-19T08:00:01Z',
    ),
  ])
  assert.deepEqual(
    record.events.map(({ kind, role }) => `${kind}/${role}`),
    ['message/user', 'message/user'],
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
  assert.notDeepEqual(before.events[2], after.events[2])

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

void test('an archived harness event keeps its role when the conversation grows', () => {
  const before = archived(capture([...opening, harness]))
  const after = capture([...opening, harness, followUp])
  assert.equal(after.events[3]?.role, 'system')

  for (const merged of [
    mergeConversationRecordFragments(before, after),
    mergeConversationRecordFragments(after, before),
    materializeConversationFragmentSet([after, before]).record,
  ]) {
    assert.deepEqual(
      merged.events.map(({ role }) => role),
      ['user', 'assistant', 'user', 'tool', 'user'],
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
    const lines = [...opening, harness]
    assert.equal(store.mergeFragment(archived(capture(lines))), 'added')
    const before = stored(store)

    // Unchanged source bytes: the provenance hash matches.
    assert.equal(store.mergeFragment(capture(lines)), 'duplicate')
    // Changed source bytes that add no event: only the roles would differ.
    const touched = capture(lines)
    touched.provenance = { ...touched.provenance, contentSha256: 'touched' }
    assert.equal(store.mergeFragment(touched), 'duplicate')
    assert.deepEqual(stored(store), before)
  } finally {
    store.close()
  }
})
