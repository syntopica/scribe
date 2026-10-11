# scribe

Read-only capture of coding-agent conversations into one canonical, redacted
archive.

Scribe discovers the conversation stores of agent clients (Claude Code and
Claude Desktop, Codex, Cursor, Gemini, Windsurf, Continue, OpenCode, OpenClaw,
Pi, Trae and others), reads them without modifying anything, normalizes every
event to one schema with stable event ids, redacts credentials and home paths,
and merges the result into a mode-0600 JSONL archive with a verified manifest. A
v2 segment store (append-only, content-addressed segments) is in progress
alongside the v1 archive.

It is layer 1 of a three-layer memory stack: Scribe captures, Atrium indexes and
retrieves, the brain holds curated knowledge.

## Use

Node 22.13 or newer and pnpm.

```bash
pnpm install
pnpm run scribe --help
pnpm run scribe doctor
pnpm run scribe export --output /tmp/scribe-export.jsonl
pnpm run scribe import --input /tmp/scribe-export.jsonl --archive ~/archive.jsonl          # dry run
pnpm run scribe import --input /tmp/scribe-export.jsonl --archive ~/archive.jsonl --apply
```

The `conversations:<command>` package scripts are kept as aliases of
`scribe <command>`. `import`, `rewrite` and `render` are dry runs unless
`--apply` is given; `export`, `capture` and `migrate-segments` write when run.

## Compatibility

Moved from `syntopica/agents` on 2026-10-11 with these names unchanged until the
v2 cutover: the archive header `rocket-agents-conversation-export`, the
environment variables `ROCKET_AGENTS_HOST`, `ROCKET_AGENTS_ARCHIVE_LOCK_WAIT_MS`
and `CLAUDE_SECONDARY_DESKTOP_DIR`, the state directory
`~/.local/state/rocket-agents/conversations`, and the archive write lock
`<archive>.write-lock`.

The wire format is pinned by a versioned fixture:
`fixtures/archive-contract/v2/` holds a provider-shaped home and the export
scribe writes from it, and a test fails when the two drift. Atrium vendors that
export in its own tests. After an intended format change, run
`pnpm contract:fixture` and copy the export into Atrium in the same change.

## Documents

- [Conversation ownership](docs/architecture/conversation-ownership.md)
- [ADR 0002: canonical conversation transport](docs/adr/0002-canonical-conversation-transport.md)
- [Runbook: conversation transport](docs/runbooks/conversation-transport.md)
- [Capability map (2026-08)](docs/research/conversation-capability-map.md)

## Check

```bash
pnpm run check
```

## License

MIT
