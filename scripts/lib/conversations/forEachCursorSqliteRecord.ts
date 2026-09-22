import { Buffer } from 'node:buffer'
import type { DatabaseSync } from 'node:sqlite'
import { MAX_CONVERSATION_FILE_BYTES } from './constants/MAX_CONVERSATION_FILE_BYTES'
import type { CursorSqliteRow } from './types/CursorSqliteRow'

export const forEachCursorSqliteRecord = (
  database: DatabaseSync,
  prefix: string,
  consume: (row: CursorSqliteRow) => void,
) => {
  const upperBound = `${prefix.slice(0, -1)};`
  const statement = database.prepare(
    'SELECT key, value FROM cursorDiskKV WHERE key >= ? AND key < ? ORDER BY key',
  )
  for (const row of statement.iterate(prefix, upperBound)) {
    if (typeof row['key'] !== 'string' || typeof row['value'] !== 'string')
      continue
    if (Buffer.byteLength(row['value']) > MAX_CONVERSATION_FILE_BYTES) {
      throw new Error(
        `Cursor conversation record exceeds the safe size limit: ${row['key']}`,
      )
    }
    consume({ key: row['key'], value: row['value'] })
  }
}
