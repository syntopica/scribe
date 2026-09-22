import { DatabaseSync } from 'node:sqlite'

export const runSqliteQuery = (databasePath: string, query: string) => {
  const database = new DatabaseSync(databasePath, { readOnly: true })
  try {
    return database.prepare(query).all() as Record<string, unknown>[]
  } finally {
    database.close()
  }
}
