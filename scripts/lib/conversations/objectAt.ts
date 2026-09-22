export const objectAt = (
  value: unknown,
  key: string,
): Record<string, unknown> | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return undefined
  const candidate = (value as Record<string, unknown>)[key]
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    Array.isArray(candidate)
  )
    return undefined
  return candidate as Record<string, unknown>
}
