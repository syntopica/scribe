/**
 * Words after a leading "token" that make a Spanish label name one: "Token de
 * Hetzner", "Token API Hetzner Cloud". A bare leading "token" is not enough,
 * or "Token count" would be a credential.
 */
export const SPANISH_TOKEN_LINKS: readonly string[] = [
  'de',
  'del',
  'api',
  'para',
]
