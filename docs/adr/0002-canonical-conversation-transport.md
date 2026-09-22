# ADR 0002: Use a canonical, security-filtered conversation transport

- Status: Accepted
- Date: 2026-08-19

## Context

Agent clients persist useful conversation history in incompatible JSON, JSONL,
and SQLite layouts. The prior cross-machine script copied selected provider
directories directly. That preserved native files but coupled transport to
provider internals, could move sensitive text unnoticed, and left the transport
implementation in `dotfiles` even though ADR 0001 assigns that responsibility to
Rocket Agents.

Two reference implementations informed the capability inventory: Historious at
commit `9b9f26fb9e9d52882be55d76880d1623021a22e4` and ai-data-extraction at
commit `b7520c48b2bb46d5a0d3257e80ca1a59670d5e37`. Their code is not vendored or
imported.

## Decision

Rocket Agents owns a versioned conversation transport with four commands:

- `conversations:doctor` inventories supported local sources without reading
  credential stores.
- `conversations:export` normalizes supported artifacts into a SHA-256-verified
  JSONL export.
- `conversations:import` verifies and merges an export into a canonical archive;
  it is a dry-run unless `--apply` is present.
- `conversations:render` creates a private Markdown corpus for Memstore; it is
  also a dry-run unless `--apply` is present.

The v1 record preserves source identity, a stable record ID, ordered
message/tool/reasoning events, timestamps when supplied, workspace context, a
source-content hash, and redaction counts. Export manifests include schema
version, record count, creation time, and a SHA-256 hash of the complete
payload.

The supported source catalog is the union of the reference projects: Claude
Code, Codex, Continue, Cursor, Gemini CLI, Hermes, Oh My Pi, OpenClaw, OpenCode,
Pi, Trae, Treechat exports, and Windsurf. JSON and JSONL are parsed directly.
OpenCode desktop Tauri stores use a bounded binary decoder. SQLite access uses
Node's built-in read-only driver and is restricted to allowlisted
conversation-bearing tables. Cursor and OpenCode receive source-specific
grouping so split database rows retain conversation boundaries; legacy fragments
with the same provider session ID are merged without dropping events.

Export, import, and render use private SQLite staging plus LF-exact JSONL
streaming. Archive size is therefore bounded by available disk rather than
JavaScript heap, and no apply destination is touched until the complete manifest
and record stream have passed validation.

Memstore remains the owner of semantic indexing, topics, and retrieval.
`dotfiles` may schedule or invoke this transport and may hold private host
names, but it does not implement the parser or the archive format.

## Security invariants

- Never transport cookies, authentication state, credential databases, SQLite
  sidecars, caches, logs, MCP state, or tool-result spill files.
- Redact private keys, bearer tokens, common provider tokens, assigned secrets,
  AWS access key IDs, and URL userinfo before serialization.
- Refuse files larger than 64 MiB, invalid schemas, hash mismatches, and
  traversal paths.
- Write exports, archives, and backups with mode `0600`; use atomic rename for
  completed exports.
- Refuse to replace an export unless the caller passes `--force`; never replace
  an existing backup.
- Replace the local home path with `[HOME]` in normalized titles, event text,
  and workspace fields.
- Never restore normalized data into a provider's live state directory.

## Consequences

- Cross-provider history has one testable contract and can be exchanged without
  copying client databases.
- Search and transport can evolve independently without building a second index
  inside the control plane.
- Normalized archives are intentionally not byte-for-byte provider backups.
  Native files remain local, and provider resume/import behavior is outside this
  transport.
- A Treechat account is never accessed implicitly. The adapter consumes explicit
  local exports from `~/.local/share/rocket-agents/treechat`.

## Verification

```bash
pnpm run conversations:test
pnpm run conversations:doctor -- --json
pnpm run check
```
