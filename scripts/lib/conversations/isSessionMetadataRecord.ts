export const isSessionMetadataRecord = (record: unknown) =>
  typeof record === 'object' &&
  record !== null &&
  (record as Record<string, unknown>)['type'] === 'session_meta'
