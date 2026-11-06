import { NEEDLE_HASH_BASE } from './constants/NEEDLE_HASH_BASE'

/**
 * The window hash after it slides one unit: `leaving` drops out (weighted by
 * `leading`, BASE^(width - 1)) and `entering` comes in.
 */
export const rollTextWindowHash = (
  hash: number,
  leaving: number,
  entering: number,
  leading: number,
) =>
  (Math.imul((hash - Math.imul(leaving, leading)) >>> 0, NEEDLE_HASH_BASE) +
    entering) >>>
  0
