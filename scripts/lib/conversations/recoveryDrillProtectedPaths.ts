import { join } from 'node:path'

/**
 * Where live conversation data lives: `$SYNTOPICA_DATA` when set, the instance
 * default `$HOME/p/wiki` always (an unset variable must not drop it), and the
 * wiki and pre-instance archive locations. The recovery drill never runs on
 * these. Without a `HOME` none of them can be computed, so that is refused.
 */
export const recoveryDrillProtectedPaths = () => {
  const home = process.env['HOME'] ?? ''
  if (home === '')
    throw new Error(
      'HOME is unset or empty, so the live data locations cannot be computed; refusing',
    )
  const data = process.env['SYNTOPICA_DATA'] ?? ''
  return [
    ...(data === '' ? [] : [data]),
    join(home, 'p', 'wiki'),
    join(home, 'p', 'wiki', 'conversations'),
    join(home, '.local', 'share', 'rocket-agents'),
  ]
}
