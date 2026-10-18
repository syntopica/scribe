import { createHash } from 'node:crypto'

/**
 * `hashText(items.join('\n'))`, fed one item at a time.
 *
 * The archive's digests cover gigabytes of materialized records: collecting
 * them for one `join` ran the real 7 GB archive out of heap, and the joined
 * string would exceed V8's maximum string length anyway. The caller supplies
 * the items already in their final order.
 */
export const createJoinedTextDigest = () => {
  const hash = createHash('sha256')
  let first = true
  return {
    add: (text: string) => {
      if (!first) hash.update('\n')
      hash.update(text)
      first = false
    },
    digest: () => hash.digest('hex'),
  }
}
