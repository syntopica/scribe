import assert from 'node:assert/strict'
import test from 'node:test'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { createConversationSegment } from './fixtures/createConversationSegment'
import { entriesFromFragments } from './fixtures/entriesFromFragments'
import { planFragmentErasure } from './fixtures/planFragmentErasure'
import { hashConversationFragment } from './hashConversationFragment'

void test('a plan names exactly the fragments it would remove', () => {
  const doomed = createConversationFragment({
    id: 'a',
    events: 2,
    source: 'leaked',
  })
  const kept = createConversationFragment({
    id: 'a',
    events: 3,
    source: 'clean',
  })
  const other = createConversationFragment({ id: 'b', events: 1 })

  const result = planFragmentErasure({
    entries: entriesFromFragments([doomed, kept, other]),
    removeFragmentSha256: [hashConversationFragment(doomed)],
  })

  assert.equal(result.conversations.length, 1)
  const [planned] = result.conversations
  assert.ok(planned !== undefined)
  assert.equal(planned.conversationId, 'a')
  assert.deepEqual(planned.removedFragmentSha256, [
    hashConversationFragment(doomed),
  ])
  // The other revision of the same conversation survives, so a redaction does
  // not silently take history with it.
  assert.equal(planned.removesConversation, false)
})

void test('removing every fragment of a conversation says so explicitly', () => {
  const result = planFragmentErasure({
    entries: entriesFromFragments([
      createConversationFragment({ id: 'a', events: 2 }),
    ]),
    removeConversationIds: ['a'],
  })
  const [planned] = result.conversations
  assert.ok(planned !== undefined)
  assert.equal(planned.removesConversation, true)
})

void test('a plan that matches nothing is empty rather than an error', () => {
  // An erasure whose target is already gone has succeeded.
  const result = planFragmentErasure({
    entries: entriesFromFragments([
      createConversationFragment({ id: 'a', events: 1 }),
    ]),
    removeFragmentSha256: ['nothing-here'],
  })
  assert.deepEqual(result.conversations, [])
})

void test('a plan binds itself to the corpus it was computed from', () => {
  const entries = entriesFromFragments([
    createConversationFragment({ id: 'a', events: 1 }),
  ])
  const against = (segmentSha256: string[]) =>
    planFragmentErasure({
      entries,
      segmentSha256,
      removeConversationIds: ['a'],
    }).segmentSetSha256

  // Order-independent, so the same archive plans identically on either host.
  assert.equal(against(['a', 'b']), against(['b', 'a']))
  // An archive that has since moved is a different corpus, and applying a plan
  // to one it never saw is how an erasure removes the wrong thing.
  assert.notEqual(against(['a', 'b']), against(['a', 'b', 'c']))
})

void test('planning reads nothing and removes nothing', () => {
  const fragments = [createConversationFragment({ id: 'a', events: 2 })]
  const before = createConversationSegment(fragments)
  planFragmentErasure({
    entries: entriesFromFragments(fragments),
    removeConversationIds: ['a'],
  })
  assert.equal(createConversationSegment(fragments), before)
})
