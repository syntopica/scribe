import assert from 'node:assert/strict'
import test from 'node:test'
import { createKnownSecretRedactor } from './createKnownSecretRedactor'
import { REDACTION_SENTINEL_ALNUM as ALNUM } from './fixtures/REDACTION_SENTINEL_ALNUM'
import { VENDOR_TOKEN_SENTINELS } from './fixtures/VENDOR_TOKEN_SENTINELS'
import { createConversationFragment } from './fixtures/createConversationFragment'
import { redactConversationRecord } from './redactConversationRecord'
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
  'export CF_API_TOKENS={v}',
  'ATOKEN={v}',
  'Primary API key: {v}',
]) {
  void test(`an inline labelled credential is redacted: ${line}`, () => {
    const value = ALNUM.slice(0, 32)
    const redacted = redactSensitiveText(line.replace('{v}', value))
    assert.ok(!redacted.text.includes(value), redacted.text)
    assert.equal(redacted.redactions, 1)
  })
}

void test('the lines after a one-line JSON-escaped private key stay', () => {
  const body = 'MII' + ALNUM.slice(0, 60)
  const text =
    '-----BEGIN ' +
    'PRIVATE KEY-----\\n' +
    body +
    '\\n-----END PRIVATE KEY-----\\n", "client_email": "bot@example.com"\n' +
    'Run pnpm install from package.json next.'
  const redacted = redactSensitiveText(text).text
  assert.ok(!redacted.includes(body), redacted)
  assert.ok(redacted.includes('"client_email": "bot@example.com"'), redacted)
  assert.ok(
    redacted.endsWith('Run pnpm install from package.json next.'),
    redacted,
  )
})

void test('a truncated one-line escaped private key goes and the rest stays', () => {
  const body = 'b3Bl' + ALNUM.slice(0, 60)
  const text =
    '"key": "-----BEGIN OPENSSH ' +
    'PRIVATE KEY-----\\n' +
    body +
    '\\n' +
    body +
    '..." (truncated)\n' +
    'Run pnpm install from package.json next.'
  const redacted = redactSensitiveText(text)
  assert.ok(!redacted.text.includes(body), redacted.text)
  assert.ok(redacted.text.includes('..." (truncated)'), redacted.text)
  assert.ok(redacted.text.endsWith('Run pnpm install from package.json next.'))
  assert.ok(redacted.redactions > 0)
})

void test('an environment assignment keeps its name and opening quote', () => {
  const value = ALNUM.slice(0, 32)
  assert.equal(
    redactSensitiveText(`export RESEND_API_KEY="${value}"`).text,
    'export RESEND_API_KEY="[REDACTED:secret]"',
  )
})

void test('an assignment value ends at an escaped newline', () => {
  const value = ALNUM.slice(0, 32)
  assert.equal(
    redactSensitiveText(`KEY=${value}\\nSTART=$(date)`).text,
    'KEY=[REDACTED:secret]\\nSTART=$(date)',
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
  'Clave de liquidación: ' + 'A0123456' + '78901234',
  'SECRETS=' + '/Users/someone/p/project-123/',
  'KEY=' + '$(date -j -f %Y)',
  'BETTER_AUTH_SECRET=' + '<run openssl1>',
  'SECRET_KEY=' + '{env.keys[0]}',
  'clave_liquidacion: ' + 'A0123456' + '78901234',
  'export SCANNED_TOKEN_PATTERN=' + 'gh[ops]_[a-z0-9]{36}',
  'OAUTH_TOKEN_URI=' + 'https://oauth2.example.com/token2',
  'MAX_TOKENS=' + 'abc12345',
  'export TOKENIZER=' + 'cl100k_base',
  'CONTACT_FORM_STORAGE_KEY=' + 'contact-form-v2',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY=' + '0x4AAAAAAABc1dEf2g',
  'Sec-WebSocket-Key: ' + 'dGhlIHNhbXBsZSBub25j' + 'ZQ1x',
  'Cache restored from key: ' + 'linux-node-' + 'abc123def456ghi789',
  'next_public_turnstile_site_key: ' + '0x4AAAAAAA' + 'Bc1dEf2gHi3j',
  'Idempotency-Key: ' + 'a1b2c3d4e5f6' + 'g7h8i9j0',
  'Token count: ' + 'abcdefghij' + '0123456789',
  'export API_TOKEN=[REDACTED:secret]',
  'Result: 12 of 34 passed',
  'SESSION_SECRET=' + 'crypto.randomBytes(32).toString(1)',
  'Google API key https:' + '//www.example.com/a/settings/apikey2',
  "key: '" + 'exports/raw/2026-10-20/part_1/' + "manifest.json'",
]) {
  void test(`ids, hashes, public keys and prose stay: ${line}`, () => {
    assert.deepEqual(redactSensitiveText(line), { text: line, redactions: 0 })
  })
}

void test('re-redacting a record leaves the events without secrets byte for byte', () => {
  const record = createConversationFragment({ id: 'mixed', events: 2 })
  const secret = 'sk_' + 'live_' + ALNUM.slice(0, 24)
  const padded = {
    ...record,
    events: [
      { ...record.events[0], text: `  the key is ${secret}  ` },
      { ...record.events[1], text: '  untouched padding  ' },
    ],
  } as typeof record
  const redacted = redactConversationRecord(padded)
  assert.equal(redacted.events[0]?.text, 'the key is [REDACTED:token]')
  assert.equal(redacted.events[1], padded.events[1])
  assert.equal(redacted.provenance.redactions, record.provenance.redactions + 1)
})

void test('a PEM BEGIN marker quoted in prose takes no text after it', () => {
  const text = [
    'Paste the -----BEGIN',
    '-----BEGIN OPENSSH PRIVATE KEY----- ... and the END marker',
    'then run pnpm install from package.json.',
    'Done.',
  ].join('\n')
  const redacted = redactSensitiveText(text).text
  assert.ok(redacted.includes('then run pnpm install from package.json.'))
  assert.ok(redacted.endsWith('Done.'))
})

void test('a known value is replaced only as a token of its own', () => {
  const redact = createKnownSecretRedactor(['k3yV4lue' + 'ZZ99'])
  const value = 'k3yV4lue' + 'ZZ99'
  assert.deepEqual(redact(`use ${value} here`), {
    text: 'use [REDACTED:secret] here',
    redactions: 1,
  })
  assert.deepEqual(redact(`hash a${value}b stays`), {
    text: `hash a${value}b stays`,
    redactions: 0,
  })
})

void test('a key printed with line numbers still goes whole', () => {
  const body = 'MII' + ALNUM.slice(0, 60)
  const text = [
    '-----BEGIN RSA ' + 'PRIVATE KEY-----',
    '   12\t' + body,
    '> ' + body,
    '-----END RSA PRIVATE KEY-----',
    'after',
  ].join('\n')
  const redacted = redactSensitiveText(text).text
  assert.ok(!redacted.includes(body), redacted)
  assert.ok(redacted.endsWith('after'))
})
