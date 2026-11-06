/**
 * Whether a "clave ..." label names a tax reference rather than a password:
 * "Clave de liquidación" is the AEAT's public settlement reference, 269 of
 * the archive's "clave" matches on 2026-11-06.
 */
export const isTaxReferenceLabel = (words: readonly string[]) =>
  words.some((word) => word.startsWith('liquid'))
