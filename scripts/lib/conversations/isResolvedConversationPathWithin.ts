import { isAbsolute, relative } from 'node:path'

/** True when the already resolved `inner` is `outer` or lies inside it. */
export const isResolvedConversationPathWithin = (
  inner: string,
  outer: string,
) => {
  const path = relative(outer, inner)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}
