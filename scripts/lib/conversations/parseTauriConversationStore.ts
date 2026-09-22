import type { TauriStoreEntry } from './types/TauriStoreEntry'

export const parseTauriConversationStore = (data: Buffer) => {
  const entries: TauriStoreEntry[] = []
  let offset = 0

  while (offset < data.length) {
    if (offset + 4 > data.length)
      throw new Error('truncated Tauri store key length')
    const keyBytes = data.readUInt32LE(offset)
    offset += 4
    if (keyBytes > 10_000 || offset + keyBytes > data.length) {
      throw new Error('invalid Tauri store key length')
    }
    const key = data.toString('utf8', offset, offset + keyBytes)
    offset += keyBytes

    if (offset + 4 > data.length)
      throw new Error('truncated Tauri store value length')
    const valueBytes = data.readUInt32LE(offset)
    offset += 4
    if (offset + valueBytes > data.length)
      throw new Error('invalid Tauri store value length')
    const valueText = data.toString('utf8', offset, offset + valueBytes)
    offset += valueBytes

    try {
      entries.push({ key, value: JSON.parse(valueText) as unknown })
    } catch {
      throw new Error(`invalid JSON in Tauri store entry: ${key}`)
    }
  }
  return entries
}
