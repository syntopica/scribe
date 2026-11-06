import { REDACTION_SENTINEL_ALNUM as A } from './REDACTION_SENTINEL_ALNUM'

/**
 * One fake token per vendor shape, assembled at run time so the repository
 * holds no string a secret scanner would flag. Shapes follow the gitleaks
 * 8.30.1 rules each one names, as Atrium's `test_vendor_token_redaction.py`.
 */
export const VENDOR_TOKEN_SENTINELS: Record<string, string> = {
  stripe: 'sk_' + 'live_' + A.slice(0, 24),
  gcp: 'AI' + 'za' + A.slice(0, 35),
  sendgrid: 'SG' + '.' + A.slice(0, 22) + '.' + A.slice(0, 43),
  perplexity: 'pplx' + '-' + A.slice(0, 48),
  airtable: 'pat' + A.slice(0, 14) + '.' + '0123456789abcdef'.repeat(4),
  age:
    'AGE-SECRET-' +
    'KEY-1' +
    'QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L'.repeat(2).slice(0, 58),
  jwt: 'ey' + A.slice(0, 20) + '.ey' + A.slice(0, 20) + '.' + A.slice(0, 16),
  'github-fine-grained': 'github' + '_pat_' + A.repeat(2).slice(0, 82),
  gitlab: 'gl' + 'pat-' + A.slice(0, 20),
  npm: 'np' + 'm_' + A.slice(0, 36),
  digitalocean: 'do' + 'p_v1_' + '0123456789abcdef'.repeat(4),
  'base64-pem': 'LS0tLS1' + 'CRUdJT' + A.slice(0, 60),
}
