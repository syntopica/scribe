import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { ARCHIVE_CONTRACT_FIXTURE_ROOT } from './constants/ARCHIVE_CONTRACT_FIXTURE_ROOT'
import type { ConversationErasurePlan } from './types/ConversationErasurePlan'
import type { ConversationRecord } from './types/ConversationRecord'
import type { KindTaggedValue } from './types/KindTaggedValue'
import { writeArchiveContractFixture } from './writeArchiveContractFixture'
import { writeArchiveContractSliceFixture } from './writeArchiveContractSliceFixture'
import { writeErasurePlanContractFixture } from './writeErasurePlanContractFixture'

void test('the committed contract export is what scribe writes today', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'scribe-contract-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const output = join(root, 'export.jsonl')
  await writeArchiveContractFixture(output)

  // Atrium vendors this file. A difference here changes the wire format it
  // reads: regenerate with `pnpm contract:fixture`, then copy the export into
  // Atrium's `tests/fixtures/` in the same change.
  assert.equal(
    await fs.readFile(output, 'utf8'),
    await fs.readFile(
      join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'export.jsonl'),
      'utf8',
    ),
  )
})

void test('the committed pending slice is what scribe writes today', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'scribe-contract-slice-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const output = join(root, 'pending-slice.jsonl')
  await writeArchiveContractSliceFixture(output)

  // Atrium vendors this file for its `ingest --partial` test. Regenerate with
  // `pnpm contract:fixture` and copy it into Atrium in the same change.
  const committed = await fs.readFile(
    join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'pending-slice.jsonl'),
    'utf8',
  )
  assert.equal(await fs.readFile(output, 'utf8'), committed)

  // A slice is an ordinary export holding a strict subset of the full one.
  const [header, ...lines] = committed.trimEnd().split('\n')
  assert.equal(
    (JSON.parse(header ?? '{}') as KindTaggedValue).kind,
    'rocket-agents-conversation-export',
  )
  const full = await fs.readFile(
    join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'export.jsonl'),
    'utf8',
  )
  const fullIds = full
    .trimEnd()
    .split('\n')
    .slice(1)
    .map((line) => (JSON.parse(line) as ConversationRecord).id)
  const sliceIds = lines.map(
    (line) => (JSON.parse(line) as ConversationRecord).id,
  )
  assert.equal(sliceIds.length, 1)
  assert.equal(sliceIds.length < fullIds.length, true)
  assert.equal(
    sliceIds.every((id) => fullIds.includes(id)),
    true,
  )
})

void test('the committed erasure plan is what scribe writes today', async (context) => {
  const root = await fs.mkdtemp(join(tmpdir(), 'scribe-contract-plan-'))
  context.after(async () => fs.rm(root, { recursive: true, force: true }))
  const output = join(root, 'erasure-plan.json')
  await writeErasurePlanContractFixture(output)
  const committed = await fs.readFile(
    join(ARCHIVE_CONTRACT_FIXTURE_ROOT, 'erasure-plan.json'),
    'utf8',
  )
  assert.equal(await fs.readFile(output, 'utf8'), committed)

  // The fields `atrium erase --plan <file>` reads. Renaming one breaks Atrium.
  const plan = JSON.parse(committed) as ConversationErasurePlan
  assert.equal(plan.kind, 'rocket-agents-conversation-erasure-plan')
  assert.equal(Array.isArray(plan.conversationIds), true)
  assert.equal(
    plan.conversationIds.every((id) => typeof id === 'string'),
    true,
  )
  assert.deepEqual(
    plan.conversationIds,
    plan.conversations.map((entry) => entry.conversationId),
  )
  assert.match(plan.fromGenerationId, /^[0-9a-f]{64}$/)
  assert.match(plan.toGenerationId ?? '', /^[0-9a-f]{64}$/)
  assert.notEqual(plan.toGenerationId, plan.fromGenerationId)
})
