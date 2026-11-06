import { NEEDLE_HASH_BASE } from './constants/NEEDLE_HASH_BASE'

/** BASE^(width - 1), the weight of the unit about to leave a rolling window. */
export const leadingWindowWeight = (width: number) => {
  let leading = 1
  for (let index = 1; index < width; index++)
    leading = Math.imul(leading, NEEDLE_HASH_BASE) >>> 0
  return leading
}
