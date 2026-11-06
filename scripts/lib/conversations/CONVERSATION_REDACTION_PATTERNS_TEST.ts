import assert from 'node:assert/strict'
import test from 'node:test'
import { REDACTION_SENTINEL_ALNUM as ALNUM } from './fixtures/REDACTION_SENTINEL_ALNUM'
import { VENDOR_TOKEN_SENTINELS } from './fixtures/VENDOR_TOKEN_SENTINELS'
import { redactSensitiveText } from './redactSensitiveText'

for (const [name, secret] of Object.entries(VENDOR_TOKEN_SENTINELS)) {
  void test(`a ${name} token is redacted in prose and in a table`, () => {
    for (const text of [
      `the key is ${secret} here`,
      `| Secret key (LIVE) | \`${secret}\` |`,
    ]) {
      const redacted = redactSensitiveText(text)
      assert.ok(!redacted.text.includes(secret), redacted.text)
      assert.ok(redacted.redactions > 0)
    }
  })
}

void test('a JSON-escaped private key is redacted', () => {
  const body = 'MII' + ALNUM.slice(0, 60)
  const text =
    '"private_key": "-----BEGIN ' +
    'PRIVATE KEY-----\\n' +
    body +
    '\\n-----END PRIVATE KEY-----\\n"'
  const redacted = redactSensitiveText(text).text
  assert.ok(!redacted.includes(body), redacted)
  assert.ok(redacted.includes('[REDACTED:private-key]'))
})

for (const line of [
  '- Client secret: `{v}`',
  'Token API Hetzner Cloud: {v}',
  '- app_id: `71c12345` / app_key: `{v}`',
  'Merchant key: `{v}`',
  'Contraseña MySQL: {v}',
  'export RESEND_API_KEY={v}',
]) {
  void test(`an inline labelled credential is redacted: ${line}`, () => {
    const value = ALNUM.slice(0, 32)
    const redacted = redactSensitiveText(line.replace('{v}', value))
    assert.ok(!redacted.text.includes(value), redacted.text)
    assert.equal(redacted.redactions, 1)
  })
}

void test('an environment assignment keeps its name and opening quote', () => {
  const value = ALNUM.slice(0, 32)
  assert.equal(
    redactSensitiveText(`export RESEND_API_KEY="${value}"`).text,
    'export RESEND_API_KEY="[REDACTED:secret]"',
  )
})

void test('an inline redaction keeps the label and the quotes', () => {
  const value = ALNUM.slice(0, 32)
  assert.equal(
    redactSensitiveText(`- Client secret: \`${value}\``).text,
    '- Client secret: `[REDACTED:secret]`',
  )
})

// Values split so a secret scanner does not read the lines as leaks.
for (const line of [
  'OAuth client ID: ' + '2c0f1234-5678-90ab-cdef-1234567890ab',
  'Commit: ' + '4f257ac8d3e1b2c4f5a6' + 'b7c8d9e0f1a2b3c4d5e6',
  'Supabase Public Key: ' + 'sb_publishable_' + 'abc123def456ghi789',
  'STOP_ALL_KEY = "Escape"',
  'next_public_turnstile_site_key: ' + '0x4AAAAAAA' + 'Bc1dEf2gHi3j',
  'Idempotency-Key: ' + 'a1b2c3d4e5f6' + 'g7h8i9j0',
  'Token count: ' + 'abcdefghij' + '0123456789',
  'export API_TOKEN=[REDACTED:secret]',
  'Result: 12 of 34 passed',
]) {
  void test(`ids, hashes, public keys and prose stay: ${line}`, () => {
    assert.deepEqual(redactSensitiveText(line), { text: line, redactions: 0 })
  })
}
