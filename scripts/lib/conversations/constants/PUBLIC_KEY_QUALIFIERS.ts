/** Inline, a bare "key" usually is one ("Merchant key", "app_key"), but these qualifiers name things that are not secrets: a Turnstile site key ships to the browser, an idempotency key is a request id. */
export const PUBLIC_KEY_QUALIFIERS: readonly string[] = [
  'public',
  'publishable',
  'primary',
  'foreign',
  'host',
  'ssh host',
  'site',
  'idempotency',
]
