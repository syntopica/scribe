export const openCodeTimestamp = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return new Date(value).toISOString()
}
