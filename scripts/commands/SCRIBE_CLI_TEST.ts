import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SCRIBE_COMMANDS } from './SCRIBE_COMMANDS'
import { scribeUsage } from './scribeUsage'

void test('every scribe subcommand loads a module that exports main', async () => {
  for (const [name, command] of Object.entries(SCRIBE_COMMANDS)) {
    const module = await command.load()
    assert.equal(typeof module.main, 'function', name)
  }
})

void test('the usage names every subcommand', () => {
  const usage = scribeUsage()
  for (const name of Object.keys(SCRIBE_COMMANDS)) {
    assert.match(usage, new RegExp(`^  ${name} `, 'm'))
  }
})
