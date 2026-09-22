import assert from 'node:assert/strict'
import test from 'node:test'
import { deriveConversationArchiveGenerationId } from './deriveConversationArchiveGenerationId'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { createConversationSegment } from './fixtures/createConversationSegment'
import { hashConversationFragment } from './hashConversationFragment'
import { serializeCanonicalConversationRecord } from './serializeCanonicalConversationRecord'
import { validateConversationSegment } from './validators/validateConversationSegment'

void test('a segment round-trips and every line ends with one LF', () => {
  const text = createConversationSegment([
    createConversationFragment({ id: 'c0', events: 2 }),
    createConversationFragment({ id: 'c1', events: 3 }),
  ])
  const { header, entries } = validateConversationSegment(text)

  assert.equal(header.entryCount, 2)
  assert.equal(entries.length, 2)
  assert.equal(text.endsWith('\n'), true)
  assert.equal(text.split('\n').length - 1, 4)
})

void test('serialization escapes what a reader would take for a line break', () => {
  // U+2028 and U+2029 terminate a line for Node's readline, and the previous
  // archive carried 1,690 and 3 of them inside event text: readline saw 32,434
  // lines where there were 30,741 records and mangled 1,634. Escaping them
  // makes the format safe for every reader rather than only for one that
  // remembers the rule.
  const separator = String.fromCharCode(0x2028)
  const paragraph = String.fromCharCode(0x2029)
  const fragment = createConversationFragment({ id: 'c', events: 1 })
  const [event] = fragment.events
  assert.ok(event !== undefined)
  const text = `before${separator}middle${paragraph}after`
  fragment.events = [{ ...event, text }]

  const line = serializeCanonicalConversationRecord(fragment)

  assert.equal(line.includes(separator), false)
  assert.equal(line.includes(paragraph), false)
  assert.equal(
    (JSON.parse(line) as { events: { text: string }[] }).events[0]?.text,
    text,
  )
})

void test('the same fragments produce the same bytes whatever order they are given in', () => {
  const a = createConversationFragment({ id: 'a', events: 2 })
  const b = createConversationFragment({ id: 'b', events: 3 })
  // Two hosts capturing the same fragments must publish one object, not two.
  assert.equal(
    createConversationSegment([a, b]),
    createConversationSegment([b, a]),
  )
})

void test('a truncated segment is rejected rather than half read', () => {
  const text = createConversationSegment([
    createConversationFragment({ id: 'c', events: 2 }),
  ])
  const truncated = `${text.split('\n').slice(0, -2).join('\n')}\n`
  assert.throws(() => validateConversationSegment(truncated), /footer/u)
})

void test('a tampered record is caught before it is believed', () => {
  const text = createConversationSegment([
    createConversationFragment({ id: 'c', events: 2 }),
  ])
  const lines = text.split('\n')
  const entryLine = lines.at(1)
  assert.ok(entryLine !== undefined)
  const entry = JSON.parse(entryLine) as { record: { title: string } }
  entry.record.title = 'changed after publication'
  lines[1] = JSON.stringify(entry)

  assert.throws(
    () => validateConversationSegment(lines.join('\n')),
    /hash does not match|payload does not match/u,
  )
})

void test('a header may not claim a schema newer than the records under it', () => {
  // The v1 archive spent an evening declaring schema 2 over schema 1 records
  // and nothing reported it. A reader trusting that header assumes qualified
  // event ids and finds unqualified ones.
  const legacy = createConversationFragment({ id: 'c', events: 1 })
  const text = createConversationSegment([
    { ...legacy, schemaVersion: 3 as unknown as 1 },
  ])
  assert.throws(() => validateConversationSegment(text), /older than a record/u)
})

void test('an entry naming a different conversation than its record is refused', () => {
  const text = createConversationSegment([
    createConversationFragment({ id: 'c', events: 1 }),
  ])
  const lines = text.split('\n')
  const entryLine = lines.at(1)
  assert.ok(entryLine !== undefined)
  const entry = JSON.parse(entryLine) as { conversationId: string }
  entry.conversationId = 'someone-else'
  lines[1] = JSON.stringify(entry)

  assert.throws(
    () => validateConversationSegment(lines.join('\n')),
    /payload does not match/u,
  )
})

void test('a generation id is derived from its base segments, not invented', () => {
  const first = hashConversationFragment(
    createConversationFragment({ id: 'a', events: 1 }),
  )
  const second = hashConversationFragment(
    createConversationFragment({ id: 'b', events: 1 }),
  )

  // Order-independent, so two hosts that split the base the same way agree.
  assert.equal(
    deriveConversationArchiveGenerationId([first, second]),
    deriveConversationArchiveGenerationId([second, first]),
  )
  // A base written as several bounded segments is the normal case: one 4 GB
  // object would put every irreplaceable conversation in a single thing whose
  // failure mode is total.
  assert.notEqual(
    deriveConversationArchiveGenerationId([first, second]),
    deriveConversationArchiveGenerationId([first]),
  )
})
