import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { ARCHIVE_CONTRACT_FIXTURE_ROOT } from './constants/ARCHIVE_CONTRACT_FIXTURE_ROOT'
import { writeArchiveContractFixture } from './writeArchiveContractFixture'

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
