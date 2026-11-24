import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { IMPORT_DIRECTORY_MIN_AGE_MS } from './constants/IMPORT_DIRECTORY_MIN_AGE_MS'
import { IMPORT_DIRECTORY_PREFIX } from './constants/IMPORT_DIRECTORY_PREFIX'
import { makeImportDirectoryFixture } from './fixtures/makeImportDirectoryFixture'
import { pathExists } from './fixtures/pathExists'
import { removeAbandonedImportDirectories } from './removeAbandonedImportDirectories'

void test('the sweep removes dead and old directories and keeps the rest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'scribe-import-sweep-'))
  try {
    // 2 ** 22 + 1 is above the pid range of the platforms in use, so no process has it.
    const dead = await makeImportDirectoryFixture(
      root,
      'dead',
      String(2 ** 22 + 1),
      0,
    )
    const live = await makeImportDirectoryFixture(
      root,
      'live',
      String(process.pid),
      30 * IMPORT_DIRECTORY_MIN_AGE_MS,
    )
    const oldUnmarked = await makeImportDirectoryFixture(
      root,
      'old',
      undefined,
      2 * IMPORT_DIRECTORY_MIN_AGE_MS,
    )
    const youngUnmarked = await makeImportDirectoryFixture(
      root,
      'young',
      undefined,
      1000,
    )
    const garbage = await makeImportDirectoryFixture(
      root,
      'garbage',
      'not a pid',
      1000,
    )
    const unrelated = join(root, 'other-directory')
    await mkdir(unrelated)
    const old = new Date(Date.now() - 30 * IMPORT_DIRECTORY_MIN_AGE_MS)
    await utimes(unrelated, old, old)
    const unrelatedFile = join(root, IMPORT_DIRECTORY_PREFIX + 'file')
    await writeFile(unrelatedFile, 'x')

    const logs: string[] = []
    const removed = await removeAbandonedImportDirectories({
      root,
      log: (message) => logs.push(message),
    })

    assert.deepEqual(
      removed,
      [dead, oldUnmarked].sort((a, b) => a.localeCompare(b)),
    )
    assert.equal(await pathExists(dead), false)
    assert.equal(await pathExists(oldUnmarked), false)
    for (const kept of [live, youngUnmarked, garbage, unrelated, unrelatedFile])
      assert.equal(await pathExists(kept), true, kept)
    assert.equal(logs.length, 3)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

void test('the sweep of a missing root removes nothing', async () => {
  assert.deepEqual(
    await removeAbandonedImportDirectories({
      root: join(tmpdir(), 'scribe-import-sweep-missing-root'),
    }),
    [],
  )
})
