import assert from 'node:assert/strict'
import test from 'node:test'
import { extractConversationText } from './extractConversationText'

void test('a tool_use block renders as the exact line `tool: <Name>`', () => {
  const text = extractConversationText([
    { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'ls' } },
  ])
  assert.equal(text, 'tool: Bash')
  // Atrium's match; a new shape readmits every archived call (README, Compatibility).
  assert.match(text, /tool: [A-Za-z0-9_.:-]+(\n|$)/u)
})

void test('the tool line closes the prose that announced it, on its own line', () => {
  const text = extractConversationText([
    { type: 'text', text: 'Reading the file.' },
    { type: 'tool_use', id: 'toolu_2', name: 'mcp__a__b', input: {} },
  ])
  assert.equal(text, 'Reading the file.\ntool: mcp__a__b')
})

void test('a nameless tool block adds no tool line', () => {
  assert.equal(
    extractConversationText([{ type: 'tool_use', id: 'toolu_3', input: {} }]),
    '',
  )
})
