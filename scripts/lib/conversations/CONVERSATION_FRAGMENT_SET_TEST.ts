import assert from 'node:assert/strict'
import test from 'node:test'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { materializeFragmentBytes as bytes } from './fixtures/materializeFragmentBytes'
import { hashConversationFragment } from './hashConversationFragment'
import { materializeConversationFragmentSet } from './materializeConversationFragmentSet'
import { qualifyConversationEventIds } from './qualifyConversationEventIds'
import { serializeCanonicalConversationRecord } from './serializeCanonicalConversationRecord'
import type { ConversationRecord } from './types/ConversationRecord'

void test('the union does not depend on the order fragments arrive in', () => {
  // The real case: one machine held 353 events of a conversation and another
  // held 356. Whichever arrives second must not be the one that decides.
  const shorter = createConversationFragment({ id: 'c', events: 353 })
  const longer = createConversationFragment({ id: 'c', events: 356 })

  const forward = bytes([shorter, longer])
  const backward = bytes([longer, shorter])
  const duplicated = bytes([longer, shorter, longer, shorter])

  assert.equal(forward, backward)
  assert.equal(forward, duplicated)
  assert.equal(
    materializeConversationFragmentSet([shorter, longer]).record.events.length,
    356,
  )
})

void test('grouping does not change the result either', () => {
  // Associativity, which the pairwise merge does not have: its provenance hash
  // nests, so (a+b)+c and a+(b+c) disagree while describing the same set.
  const a = createConversationFragment({ id: 'c', events: 2, source: 'a' })
  const b = createConversationFragment({ id: 'c', events: 3, source: 'b' })
  const c = createConversationFragment({ id: 'c', events: 4, source: 'c' })

  assert.equal(bytes([a, b, c]), bytes([c, b, a]))
  assert.equal(bytes([a, b, c]), bytes([b, a, c]))
})

void test('a fragment seen twice counts once', () => {
  const only = createConversationFragment({ id: 'c', events: 3 })
  const once = materializeConversationFragmentSet([only])
  const twice = materializeConversationFragmentSet([only, { ...only }])
  assert.equal(
    serializeCanonicalConversationRecord(once.record),
    serializeCanonicalConversationRecord(twice.record),
  )
  assert.equal(
    once.record.provenance.redactions,
    twice.record.provenance.redactions,
  )
})

void test('one event id with two byte forms keeps both and reports the conflict', () => {
  // The id hashes index and redacted text only, so a change to how kind, role
  // or timestamp are derived produces this without any text changing. Two
  // machines on different commits is the ordinary way it happens.
  const original = createConversationFragment({
    id: 'c',
    events: 1,
    source: 'a',
  })
  const rederived = createConversationFragment({
    id: 'c',
    events: 1,
    source: 'b',
  })
  const [originalEvent] = rederived.events
  assert.ok(originalEvent !== undefined)
  rederived.events = [
    {
      id: originalEvent.id,
      kind: originalEvent.kind,
      role: 'assistant',
      text: originalEvent.text,
      ...(originalEvent.timestamp === undefined
        ? {}
        : { timestamp: originalEvent.timestamp }),
    },
  ]

  const result = materializeConversationFragmentSet([original, rederived])

  assert.equal(result.conflicts.length, 1)
  const [conflict] = result.conflicts
  assert.ok(conflict !== undefined)
  assert.equal(conflict.variants.length, 2)
  assert.equal(result.record.events.length, 1)
  // Deterministic either way round, so two machines agree without talking.
  assert.equal(
    serializeCanonicalConversationRecord(result.record),
    serializeCanonicalConversationRecord(
      materializeConversationFragmentSet([rederived, original]).record,
    ),
  )
})

void test('a legacy fragment is upgraded before its events are compared', () => {
  // Unqualified and qualified ids describe the same event. Comparing them as
  // they stand would carry it twice, which is the doubling the schema change
  // was designed to avoid.
  const current = createConversationFragment({
    id: 'c',
    events: 2,
    source: 'a',
  })
  const legacy: ConversationRecord = {
    ...current,
    schemaVersion: 1,
    provenance: { ...current.provenance, contentSha256: 'legacy' },
    events: current.events.map((event, index) => ({
      ...event,
      id: `raw-${String(index)}`,
    })),
  }
  legacy.events = legacy.events.map((event) => ({ ...event }))
  const upgradedEvents = qualifyConversationEventIds(legacy.events, legacy.id)
  const matching: ConversationRecord = { ...current, events: upgradedEvents }

  const result = materializeConversationFragmentSet([legacy, matching])

  assert.equal(result.record.events.length, 2)
  assert.equal(result.conflicts.length, 0)
})

void test('unrelated fragments are refused rather than blended', () => {
  const left = createConversationFragment({ id: 'c', events: 1 })
  const right = {
    ...createConversationFragment({ id: 'c', events: 1 }),
    sourceId: 'other',
  }
  assert.throws(
    () => materializeConversationFragmentSet([left, right]),
    /unrelated conversation fragments/u,
  )
})

void test('no fragments is an error, not an empty conversation', () => {
  assert.throws(() => materializeConversationFragmentSet([]), /no fragments/u)
})

void test('identical bytes hash identically and different bytes do not', () => {
  const one = createConversationFragment({ id: 'c', events: 2 })
  const same = createConversationFragment({ id: 'c', events: 2 })
  const other = createConversationFragment({ id: 'c', events: 3 })
  assert.equal(hashConversationFragment(one), hashConversationFragment(same))
  assert.notEqual(
    hashConversationFragment(one),
    hashConversationFragment(other),
  )
})

void test('a migrated fragment with a joined path contributes each path once', () => {
  const legacy: ConversationRecord = {
    ...createConversationFragment({ id: 'c', events: 3, source: 'legacy' }),
    provenance: {
      contentSha256: 'legacy-merge',
      relativePath: 'a.jsonl,b.jsonl',
      redactions: 0,
    },
  }
  const fresh = createConversationFragment({ id: 'c', events: 2, source: 'a' })

  const { record } = materializeConversationFragmentSet([legacy, fresh])
  assert.equal(record.provenance.relativePath, 'a.jsonl,b.jsonl')
})
