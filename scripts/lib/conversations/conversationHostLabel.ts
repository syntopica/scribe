import { hostname } from 'node:os'

/**
 * The label a capture stamps on every record it observes.
 *
 * `ROCKET_AGENTS_HOST` wins when set, so the dotfiles can name the two Macs
 * the way the rest of the tooling does (`peer-a`, `peer-b`) instead of
 * whatever the Bonjour name happens to be. The fallback is the short hostname,
 * lowercased: `example-host.local` becomes
 * `example-host`, which is the label the brain's session converter
 * already uses for local roots.
 */
export const conversationHostLabel = (
  environment: NodeJS.ProcessEnv = process.env,
) => {
  const configured = environment['ROCKET_AGENTS_HOST']?.trim()
  if (configured !== undefined && configured.length > 0) return configured
  const short = hostname().split('.').at(0)?.trim().toLowerCase() ?? ''
  return short.length > 0 ? short : 'unknown-host'
}
