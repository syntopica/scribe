/**
 * Credential shapes a vendor stamps with a fixed prefix, taken from gitleaks'
 * rules (8.30.1), applied after the generic token patterns.
 *
 * Ported from Atrium's `vendor_token_patterns.py`: Stripe live keys, Google
 * API keys, Airtable tokens, an age secret key, base64 private keys (an inline
 * one is `redactInlinePrivateKeys`) and `export NAME_KEY=value` lines reached its context output
 * from curated notes. Only prefixed shapes are kept, because a bare hex or
 * base64 run is as often a hash or an id as a secret.
 */
export const VENDOR_TOKEN_PATTERNS: readonly (readonly [RegExp, string])[] = [
  // a PEM block base64-encoded once more: "-----BEGIN" is "LS0tLS1CRUdJT"
  [/\bLS0tLS1CRUdJT[A-Za-z0-9+/=]{40,}/gu, '[REDACTED:private-key]'],
  // stripe-access-token
  [/\b(?:sk|rk)_(?:test|live|prod)_[A-Za-z0-9]{10,99}\b/gu, '[REDACTED:token]'],
  // gcp-api-key
  [/\bAIza[\w-]{35}(?![\w-])/gu, '[REDACTED:token]'],
  // sendgrid-api-token
  [/\bSG\.[\w=.-]{66}/gu, '[REDACTED:token]'],
  // perplexity-api-key
  [/\bpplx-[A-Za-z0-9]{48}\b/gu, '[REDACTED:token]'],
  // airtable-personnal-access-token
  [/\bpat[A-Za-z0-9]{14}\.[a-f0-9]{64}\b/gu, '[REDACTED:token]'],
  // age-secret-key
  [
    /AGE-SECRET-KEY-1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{58}/gu,
    '[REDACTED:secret]',
  ],
  // jwt (header and payload both start with base64 '{"')
  [
    /\bey[A-Za-z0-9]{17,}\.ey[\w/\\-]{17,}\.[\w/\\-]{10,}={0,2}/gu,
    '[REDACTED:token]',
  ],
  // sourcegraph-access-token (prefixed form only)
  [/\bsgp_(?:[a-fA-F0-9]{16}_|local_)?[a-fA-F0-9]{40}\b/gu, '[REDACTED:token]'],
  // dropbox-short-lived-api-token
  [/\bsl\.[\w=-]{135}/gu, '[REDACTED:token]'],
  // github-fine-grained-pat
  [/\bgithub_pat_\w{82}\b/gu, '[REDACTED:token]'],
  // gitlab-pat
  [/\bglpat-[\w-]{20}\b/gu, '[REDACTED:token]'],
  // npm-access-token
  [/\bnpm_[A-Za-z0-9]{36}\b/gu, '[REDACTED:token]'],
  // huggingface-access-token
  [/\bhf_[A-Za-z]{34}\b/gu, '[REDACTED:token]'],
  // digitalocean-pat / -access-token / -refresh-token
  [/\bdo[opr]_v1_[a-f0-9]{64}\b/gu, '[REDACTED:token]'],
  // shopify-access-token and siblings
  [/\bshp(?:at|ca|pa|ss)_[a-fA-F0-9]{32}\b/gu, '[REDACTED:token]'],
  // linear-api-key
  [/\blin_api_[A-Za-z0-9]{40}\b/gu, '[REDACTED:token]'],
  // pypi-upload-token
  [/\bpypi-AgEIcHlwaS5vcmc[\w-]{50,}/gu, '[REDACTED:token]'],
  // postman-api-token
  [/\bPMAK-[a-f0-9]{24}-[a-f0-9]{34}\b/gu, '[REDACTED:token]'],
  // telegram-bot-api-token
  [/\b\d{5,16}:AA[\w-]{33}\b/gu, '[REDACTED:token]'],
]
