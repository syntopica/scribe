# Conversation ownership

## Decision

Conversation capabilities have one ecosystem owner each. Repositories may invoke
an owner's public interface, but they must not reproduce its provider knowledge,
normalization, integrity, merge, or indexing logic.

| Capability                                                                          | Owner         | Other repositories may                                  |
| ----------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------- |
| Provider discovery and read-only capture                                            | Rocket Agents | Invoke `conversations:doctor` or `conversations:export` |
| Canonical schema, redaction, manifests, deduplication, backups, and archive updates | Rocket Agents | Exchange the resulting mode-0600 JSONL archive          |
| Private hosts, authenticated SSH/rsync exchange, local paths, and schedules         | `dotfiles`    | Invoke Rocket Agents export/import on each trusted host |
| Rendered-corpus indexing, entities, topics, lexical search, and semantic search     | Memstore      | Consume Markdown rendered by Rocket Agents              |
| Deliberate human-authored knowledge                                                 | `brain`       | Link to indexed evidence                                |

## Dependency direction

```text
provider state --read--> Rocket Agents canonical archive
                               |
                               +-- dotfiles exchanges archive --> Rocket Agents import
                               |
                               +-- Rocket Agents render --> Memstore index --> search
```

Dependencies do not point back toward provider state. Memstore never supplies
transport records, and `dotfiles` never interprets provider files or canonical
records.

## Prohibited duplication

- `dotfiles` must not enumerate provider storage, parse JSON/JSONL/SQLite
  conversations, merge native history, copy provider databases, implement
  redaction, or copy Memstore storage.
- Memstore integration code must not discover provider state, exchange archives
  between machines, schedule transport, or define a second BusiRocket provider
  catalog.
- Rocket Agents must not contain private host aliases, personal schedules, SSH
  credentials, or a semantic index implementation.
- Compatibility aliases for a retired workflow are removed instead of maintained
  indefinitely.

Memstore continues to support its upstream standalone transcript import formats.
In the BusiRocket integration those importers are compatibility inputs only: new
provider coverage lands in Rocket Agents, and Memstore consumes the rendered
Markdown corpus.

## Verification

Run the owner-specific gates:

```bash
cd ~/p/agents && pnpm run conversations:test
cd ~/p/dotfiles && ./scripts/check
cd ~/p/memstore && uv run pytest tests/test_normalize.py tests/test_convo_miner_unit.py -q
```

The `dotfiles` gate statically rejects native provider paths and retired merge
entrypoints. Rocket Agents tests cover capture, normalization, security, import,
and render behavior. Memstore tests cover generic transcript-to-index ingestion.
