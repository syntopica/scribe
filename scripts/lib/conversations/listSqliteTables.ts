import { runSqliteQuery } from './runSqliteQuery'

export const listSqliteTables = (database: string) => {
  const rows = runSqliteQuery(
    database,
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  )
  return rows.flatMap((row) =>
    typeof row['name'] === 'string' ? [row['name']] : [],
  )
}
