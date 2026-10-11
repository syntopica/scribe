# Conversation ownership

## Decision

Conversation capabilities have one owner each. Repositories may invoke an
owner's public interface, but they must not reproduce its provider knowledge,
normalization, integrity, merge, or indexing logic.

| Capability                                                                          | Owner      | Other repositories may                           |
| ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------------ |
| Provider discovery and read-only capture                                            | Scribe     | Invoke `scribe doctor` or `scribe export`        |
| Canonical schema, redaction, manifests, deduplication, backups, and archive updates | Scribe     | Exchange the resulting mode-0600 JSONL archive   |
| Private hosts, authenticated SSH/rsync exchange, local paths, and schedules         | `dotfiles` | Invoke Scribe export/import on each trusted host |
| Indexing, lexical and semantic retrieval, synthesis                                 | Atrium     | Consume the canonical archive (`atrium ingest`)  |
| Deliberate human-authored knowledge                                                 | `brain`    | Link to indexed evidence                         |

Capture moved here from `syntopica/agents` at commit `832040c` on 2026-10-11.
Memstore, the earlier indexing owner, is retired; Atrium reads the archive
itself rather than a rendered corpus.

## Data flow

```text
provider state --read--> Scribe canonical archive
                               |
                               +-- dotfiles exchanges archive --> Scribe import
                               |
                               +-- Atrium ingest --> index --> search
```

Dependencies do not point back toward provider state. Atrium never supplies
records to Scribe.

## Prohibited duplication

- Other repositories must not read provider databases, transcripts or desktop
  stores directly, re-implement event identity, timestamp normalization or
  redaction, or merge archives themselves.
- Atrium must not discover provider state, exchange archives between machines,
  or schedule transport.
- Scribe must not contain private host aliases, personal schedules, SSH
  configuration, or anything that names its owner's machines.

## Verification

```bash
pnpm run check
```

Scribe's tests cover capture, normalization, security, import, render, and the
v2 segment store. Atrium's tests encode the archive header
(`rocket-agents-conversation-export`) and event-id derivation; that wire format
does not change without a versioned fixture both repositories consume.
