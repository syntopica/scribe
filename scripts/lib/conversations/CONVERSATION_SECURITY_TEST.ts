import assert from 'node:assert/strict'
import test from 'node:test'
import { isConversationRecord } from './isConversationRecord'
import { redactSensitiveText } from './redactSensitiveText'

void test('secret redaction covers credentials without logging their values', () => {
  const fakeAccessKey = 'AKIA' + 'ABCDEFGHIJKLMNOP'
  const result = redactSensitiveText(
    `Authorization: Bearer abcdefghijklmnopqrstuvwxyz password=supersecret ${fakeAccessKey} https://user:pass@example.test`,
  )

  assert.equal(result.redactions, 4)
  assert.equal(result.text.includes('supersecret'), false)
  assert.equal(result.text.includes(fakeAccessKey), false)
  assert.equal(result.text.includes('user:pass'), false)
})

void test('import validation rejects traversal paths', () => {
  assert.equal(
    isConversationRecord({
      schemaVersion: 1,
      id: 'id',
      source: 'codex',
      sourceId: 'source',
      title: 'title',
      events: [],
      provenance: {
        contentSha256: 'hash',
        relativePath: '../../credentials',
        redactions: 0,
      },
    }),
    false,
  )
})

void test('redaction is idempotent: a second pass changes nothing and counts nothing', () => {
  const fakeAccessKey = 'AKIA' + 'ABCDEFGHIJKLMNOP'
  const first = redactSensitiveText(
    `Authorization: Bearer abcdefghijklmnopqrstuvwxyz password="supersecret" api_key: 'abcdefghijkl' ${fakeAccessKey} https://user:pass@example.test`,
  )
  assert.equal(first.redactions, 5)
  assert.equal(first.text.includes('supersecret'), false)
  assert.equal(first.text.includes('abcdefghijkl'), false)

  // Every marker used to re-match its own pattern: `Bearer [REDACTED:token]`
  // is sixteen non-space characters, `[REDACTED:credentials]@` is a
  // userinfo, `[REDACTED:secret]` is an assigned value. The text was stable
  // and the count was not, which inflated `provenance.redactions` on every
  // re-capture of unchanged text.
  const second = redactSensitiveText(first.text)
  assert.equal(second.text, first.text)
  assert.equal(second.redactions, 0)
})
