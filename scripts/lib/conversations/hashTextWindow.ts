import { NEEDLE_HASH_BASE } from './constants/NEEDLE_HASH_BASE'

/** The 32-bit polynomial hash of `length` UTF-16 units of `text` from `start`. */
export const hashTextWindow = (text: string, start: number, length: number) => {
  let hash = 0
  for (let index = start; index < start + length; index++)
    hash = (Math.imul(hash, NEEDLE_HASH_BASE) + text.charCodeAt(index)) >>> 0
  return hash
}
