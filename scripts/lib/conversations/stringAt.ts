export const stringAt = (value: unknown, key: string) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return undefined
  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'string' ? candidate : undefined
}
