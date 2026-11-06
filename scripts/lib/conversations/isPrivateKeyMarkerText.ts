/**
 * Whether a removed piece is nothing but a PEM BEGIN or END marker, which
 * every mention of a key repeats: as a needle it flagged prose and docs in
 * 19 fragments as holding a secret (2026-11-06).
 */
export const isPrivateKeyMarkerText = (text: string) =>
  /^-----(?:BEGIN|END) [A-Z0-9 ]*PRIVATE KEY-----$/u.test(text.trim())
