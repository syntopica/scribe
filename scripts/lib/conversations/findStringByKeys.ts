export const findStringByKeys = (
  value: unknown,
  keys: ReadonlySet<string>,
  depth = 0,
): string | undefined => {
  if (depth > 6 || typeof value !== 'object' || value === null) return undefined
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findStringByKeys(entry, keys, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }

  const object = value as Record<string, unknown>
  for (const [key, candidate] of Object.entries(object)) {
    if (
      keys.has(key) &&
      typeof candidate === 'string' &&
      candidate.trim() !== ''
    ) {
      return candidate.trim()
    }
  }
  for (const candidate of Object.values(object)) {
    const found = findStringByKeys(candidate, keys, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}
