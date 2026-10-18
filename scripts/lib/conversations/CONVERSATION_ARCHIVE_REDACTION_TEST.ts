import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { activateConversationArchiveGeneration } from './activateConversationArchiveGeneration'
import { applyConversationArchiveErasure } from './applyConversationArchiveErasure'
import { exportMaterializedConversationArchive } from './exportMaterializedConversationArchive'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { planRedactionAgainstArchive } from './fixtures/planRedactionAgainstArchive'
import { redactFragmentsInArchive } from './fixtures/redactFragmentsInArchive'
import { REDACTION_FIXTURE_SECRET } from './fixtures/REDACTION_FIXTURE_SECRET'
import { seedRedactionArchive } from './fixtures/seedRedactionArchive'
import { hashConversationFragment } from './hashConversationFragment'
import { listConversationSecretTokens } from './listConversationSecretTokens'
import { listRedactedSpans } from './listRedactedSpans'
import { planConversationArchiveErasureFromRoot } from './planConversationArchiveErasureFromRoot'
import { readConversationArchiveGenerationManifest } from './readConversationArchiveGenerationManifest'
import { redactSensitiveText } from './redactSensitiveText'
import { streamConversationExport } from './streamConversationExport'
import type { ConversationRecord } from './types/ConversationRecord'
import { validateConversationErasurePlan } from './validators/validateConversationErasurePlan'
import { verifyConversationArchiveErasure } from './verifyConversationArchiveErasure'

void test('a redaction replaces the leaked fragment with its re-redacted form', async (context) => {
  const archive = await seedRedactionArchive(context)
  const plan = validateConversationErasurePlan(
    JSON.parse(
      JSON.stringify(await planRedactionAgainstArchive(archive.root)),
    ) as unknown,
  )
  assert.deepEqual(plan.conversationIds, ['s'])
  assert.match(plan.redactorSha256 ?? '', /^[0-9a-f]{64}$/)
  // Only the leaked revision is planned; the clean one is not named.
  assert.deepEqual(plan.conversations, [
    {
      conversationId: 's',
      removedFragmentSha256: [hashConversationFragment(archive.leaked)],
      removesConversation: false,
    },
  ])

  const applied = await applyConversationArchiveErasure({
    root: archive.root,
    plan,
    createdAt: '2026-10-18T12:01:00.000Z',
    buckets: 2,
  })
  assert.deepEqual(applied.unchanged, [])
  assert.equal(applied.fragmentsRemoved, 1)
  assert.equal(applied.fragmentsReplaced, 1)
  assert.equal(applied.fragmentsKept, 2)
  assert.deepEqual(applied.unmatched, [])

  const verified = await verifyConversationArchiveErasure({
    root: archive.root,
    plan,
    generationId: applied.generationId,
  })
  assert.equal(verified.ok, true, JSON.stringify(verified))
  assert.equal(verified.fragmentsReplaced, 1)
  assert.equal(verified.fragmentsAfter, 3)

  const sealed = await readConversationArchiveGenerationManifest(
    archive.root,
    applied.generationId,
  )
  const texts = (
    await Promise.all(
      sealed.generation.baseSegmentSha256.map(async (sha256) =>
        fs.readFile(join(sealed.segments, `s_${sha256}.jsonl`), 'utf8'),
      ),
    )
  ).join('')
  assert.equal(texts.includes(REDACTION_FIXTURE_SECRET), false)
  assert.equal(texts.includes(hashConversationFragment(archive.other)), true)

  await activateConversationArchiveGeneration({
    root: archive.root,
    generationId: applied.generationId,
    updatedAt: '2026-10-18T12:02:00.000Z',
  })
  const output = join(archive.root, 'materialized.jsonl')
  await exportMaterializedConversationArchive({
    root: archive.root,
    statePath: archive.statePath,
    output,
    now: new Date('2026-10-18T12:03:00.000Z'),
  })
  const records: ConversationRecord[] = []
  const streamed = await streamConversationExport(output, (record) =>
    records.push(record),
  )
  assert.deepEqual(streamed.errors, [])
  assert.deepEqual(
    records.map((record) => record.id),
    ['b', 's'],
  )
  const redacted = records.find((record) => record.id === 's')
  assert.deepEqual(
    redacted?.events.map((event) => event.text),
    ['connect with password=[REDACTED:secret]', 'event 1 of s', 'event 2 of s'],
  )
})

void test('verify finds the secret in a generation that was not redacted', async (context) => {
  const archive = await seedRedactionArchive(context)
  const plan = await planRedactionAgainstArchive(archive.root)
  // Same base, but only `b` was taken out: the leaked fragment is still there.
  const erased = await applyConversationArchiveErasure({
    root: archive.root,
    plan: await planConversationArchiveErasureFromRoot({
      root: archive.root,
      createdAt: '2026-10-18T12:00:00.000Z',
      reason: 'erasure',
      removeConversationIds: ['b'],
    }),
    createdAt: '2026-10-18T12:01:00.000Z',
  })

  const verified = await verifyConversationArchiveErasure({
    root: archive.root,
    plan,
    generationId: erased.generationId,
  })
  assert.equal(verified.ok, false)
  assert.deepEqual(verified.secretsPresent, [
    hashConversationFragment(archive.leaked),
  ])
  assert.deepEqual(verified.removedPresent, [
    hashConversationFragment(archive.leaked),
  ])
  assert.equal(verified.keptMissing.length, 2)
})

void test('a redaction request with nothing to redact plans nothing', async (context) => {
  const archive = await seedRedactionArchive(context)
  const matched = new Set<string>()
  const plan = await planConversationArchiveErasureFromRoot({
    root: archive.root,
    createdAt: '2026-10-18T12:00:00.000Z',
    reason: 'redaction',
    removeConversationIds: ['b', 'missing-id'],
    matchedConversationIds: matched,
  })
  assert.deepEqual(plan.conversationIds, [])
  assert.deepEqual(plan.conversations, [])
  assert.deepEqual([...matched], ['b'])
})

void test('a redaction plan is refused once the redactor has changed', async (context) => {
  const archive = await seedRedactionArchive(context)
  const plan = await planRedactionAgainstArchive(archive.root)
  const changed = { ...plan, redactorSha256: '0'.repeat(64) }
  await assert.rejects(
    applyConversationArchiveErasure({
      root: archive.root,
      plan: changed,
      createdAt: '2026-10-18T12:01:00.000Z',
    }),
    /the redactor has changed since the plan was computed/,
  )
  assert.throws(
    () =>
      validateConversationErasurePlan({ ...plan, redactorSha256: undefined }),
    /redactorSha256/,
  )
})

void test('the redacted spans are the text the redactor took out', () => {
  const original = [
    'token Bearer abcdefghijklmnopqrstuvwx and [REDACTED:token] kept',
    '-----BEGIN RSA PRIVATE KEY-----',
    'MIIEsecretkeybody',
    '-----END RSA PRIVATE KEY-----',
    'tail',
  ].join('\n')
  assert.deepEqual(
    listRedactedSpans(original, redactSensitiveText(original).text),
    [
      'abcdefghijklmnopqrstuvwx',
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEsecretkeybody\n-----END RSA PRIVATE KEY-----',
    ],
  )
})

void test('a secret in a field the redactor cannot rewrite fails verify and is reported', async (context) => {
  const base = createConversationFragment({ id: 'u', events: 2 })
  const leaked: ConversationRecord = {
    ...base,
    events: base.events.map((event, index) =>
      index === 0
        ? { ...event, text: `password=${REDACTION_FIXTURE_SECRET}` }
        : event,
    ),
    provenance: {
      ...base.provenance,
      relativePath: [`leak-${REDACTION_FIXTURE_SECRET}.jsonl`],
    },
  }
  const { plan, unredactable, verified } = await redactFragmentsInArchive(
    context,
    [leaked],
    ['u'],
  )
  assert.deepEqual(plan.conversationIds, ['u'])
  assert.deepEqual([...unredactable], ['u'])
  assert.equal(verified.ok, false)
  assert.equal(
    verified.problems.some((problem) =>
      problem.includes(
        'unredactable field entry.record.provenance.relativePath[0]',
      ),
    ),
    true,
    JSON.stringify(verified.problems),
  )
})

void test('a bare copy of a quoted secret in another fragment fails verify', async (context) => {
  const quotedBase = createConversationFragment({
    id: 'q',
    events: 2,
    source: 'quoted',
  })
  const quoted: ConversationRecord = {
    ...quotedBase,
    events: quotedBase.events.map((event, index) =>
      index === 0
        ? { ...event, text: 'login password="fixture-secret-123" ok' }
        : event,
    ),
  }
  const bareBase = createConversationFragment({
    id: 'q',
    events: 3,
    source: 'bare',
  })
  const bare: ConversationRecord = {
    ...bareBase,
    events: bareBase.events.map((event, index) =>
      index === 2
        ? { ...event, text: 'the value was fixture-secret-123' }
        : event,
    ),
  }
  const { plan, verified } = await redactFragmentsInArchive(
    context,
    [quoted, bare],
    ['q'],
  )
  assert.deepEqual(plan.conversations[0]?.removedFragmentSha256, [
    hashConversationFragment(quoted),
  ])
  assert.equal(verified.ok, false)
  assert.deepEqual(verified.secretsPresent, [hashConversationFragment(bare)])
})

void test('a secret only in the workspace is planned and removed', async (context) => {
  const leaked = createConversationFragment({
    id: 'w',
    events: 1,
    workspace: `/srv/app password=${REDACTION_FIXTURE_SECRET}`,
  })
  const { archive, plan, applied, verified } = await redactFragmentsInArchive(
    context,
    [leaked],
    ['w'],
  )
  assert.deepEqual(plan.conversationIds, ['w'])
  assert.equal(applied.fragmentsReplaced, 1)
  assert.equal(verified.ok, true, JSON.stringify(verified))
  const sealed = await readConversationArchiveGenerationManifest(
    archive.root,
    applied.generationId,
  )
  const texts = await Promise.all(
    sealed.generation.baseSegmentSha256.map(async (sha256) =>
      fs.readFile(join(sealed.segments, `s_${sha256}.jsonl`), 'utf8'),
    ),
  )
  assert.equal(texts.join('').includes(REDACTION_FIXTURE_SECRET), false)
  assert.equal(
    texts.join('').includes('/srv/app password=[REDACTED:secret]'),
    true,
  )
})

void test('a quoted secret is searched for as its bare value', () => {
  const original = 'password="fixture-secret-123" and https://ab@host'
  assert.deepEqual(
    listRedactedSpans(original, redactSensitiveText(original).text),
    ['fixture-secret-123'],
  )
})

void test('an all-letter key line is a needle, a long ordinary word is not', () => {
  const line =
    'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2'.replaceAll(
      /[^A-Za-z]/gu,
      'x',
    )
  assert.equal(
    listConversationSecretTokens(`-----BEGIN KEY-----\n${line}\n`).includes(
      line,
    ),
    true,
  )
  assert.deepEqual(
    listConversationSecretTokens('internationalization PRIVATE'),
    [],
  )
})

void test('the bare password of removed URL credentials fails verify', async (context) => {
  const withUrl = createConversationFragment({
    id: 'r',
    events: 1,
    source: 'url',
  })
  const url: ConversationRecord = {
    ...withUrl,
    events: withUrl.events.map((event) => ({
      ...event,
      text: 'clone https://alice:supersecret123@host/repo',
    })),
  }
  const withCopy = createConversationFragment({
    id: 'r',
    events: 2,
    source: 'copy',
  })
  const copy: ConversationRecord = {
    ...withCopy,
    events: withCopy.events.map((event, index) =>
      index === 1 ? { ...event, text: 'the pw is supersecret123' } : event,
    ),
  }
  const { plan, verified } = await redactFragmentsInArchive(
    context,
    [url, copy],
    ['r'],
  )
  assert.deepEqual(plan.conversations[0]?.removedFragmentSha256, [
    hashConversationFragment(url),
  ])
  assert.equal(verified.ok, false)
  assert.deepEqual(verified.secretsPresent, [hashConversationFragment(copy)])
})

void test('one surviving line of a removed key fails verify, prose about keys does not', async (context) => {
  const bodyLine = 'MIIEowIBAAKCAQEA7synthetic0key1body2line3'
  const withKey = createConversationFragment({
    id: 'k',
    events: 1,
    source: 'pem',
  })
  const key: ConversationRecord = {
    ...withKey,
    events: withKey.events.map((event) => ({
      ...event,
      text: [
        'here is the key',
        '-----BEGIN RSA PRIVATE KEY-----',
        bodyLine,
        'c2Vjb25kIGxpbmUgb2YgdGhlIHN5bnRoZXRpYyBrZXk=',
        '-----END RSA PRIVATE KEY-----',
      ].join('\n'),
    })),
  }
  const withProse = createConversationFragment({ id: 'p', events: 1 })
  const prose: ConversationRecord = {
    ...withProse,
    events: withProse.events.map((event) => ({
      ...event,
      text: 'never paste a PRIVATE KEY; a -----BEGIN CERTIFICATE----- block is public, password rotation matters',
    })),
  }
  const clean = await redactFragmentsInArchive(context, [key, prose], ['k'])
  assert.equal(clean.verified.ok, true, JSON.stringify(clean.verified))

  const withLine = createConversationFragment({
    id: 'k',
    events: 2,
    source: 'line',
  })
  const line: ConversationRecord = {
    ...withLine,
    events: withLine.events.map((event, index) =>
      index === 1 ? { ...event, text: `key starts ${bodyLine}` } : event,
    ),
  }
  const leaked = await redactFragmentsInArchive(
    context,
    [key, line, prose],
    ['k'],
  )
  assert.equal(leaked.verified.ok, false)
  assert.deepEqual(leaked.verified.secretsPresent, [
    hashConversationFragment(line),
  ])
})
