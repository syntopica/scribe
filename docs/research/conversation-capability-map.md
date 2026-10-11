# Conversation capability coverage

> Written 2026-08 when capture lived in Rocket Agents (now `syntopica/agents`)
> and Memstore owned search. Capture moved to Scribe on 2026-10-11 and Atrium
> replaced Memstore; the comparison below is kept as written.

This map compares the Rocket Agents ecosystem with the observable capabilities
of [Historious](https://github.com/nikvdp/historious) at
`9b9f26fb9e9d52882be55d76880d1623021a22e4` and
[ai-data-extraction](https://github.com/0xSero/ai-data-extraction) at
`b7520c48b2bb46d5a0d3257e80ca1a59670d5e37`. It records capability coverage, not
code lineage; the implementation in this repository is independent.

| Capability                                                 | Rocket Agents owner                                 | Coverage                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Claude Code and Codex capture                              | Conversation transport                              | Direct JSONL adapters                                                           |
| Continue and Gemini capture                                | Conversation transport                              | Direct JSON adapters                                                            |
| Cursor, Trae, and Windsurf capture                         | Conversation transport                              | Read-only allowlisted SQLite adapters with tab, bubble, and agent normalization |
| OpenCode capture                                           | Conversation transport                              | Legacy JSON, normalized SQLite, and desktop Tauri-store adapters                |
| Pi, Oh My Pi, OpenClaw, and Hermes capture                 | Conversation transport                              | Direct JSON/JSONL adapters                                                      |
| Treechat capture                                           | Conversation transport                              | Explicit local export drop; no implicit account authentication                  |
| Canonical JSONL extraction                                 | Conversation transport                              | Versioned records plus SHA-256 integrity manifest                               |
| Message, tool, result, summary, and reasoning preservation | Conversation transport                              | Ordered typed events                                                            |
| Stable machine-readable output                             | Conversation transport                              | JSON doctors and JSONL archives                                                 |
| Deduplication and changed-session replacement              | Conversation import                                 | Stable source IDs plus content hashes                                           |
| Cross-machine exchange                                     | Conversation transport plus SSH/rsync orchestration | Portable verified archive; host details remain in `dotfiles`                    |
| Backups and reversible archive updates                     | Conversation import                                 | Dry-run default and mode-0600 backup before replacement                         |
| Search corpus handoff                                      | Conversation render                                 | Dry-run default and private per-session Markdown files                          |
| Lexical and semantic search                                | Memstore                                            | CLI and MCP retrieval over the rendered conversation corpus                     |
| Topic/entity organization and enrichment                   | Memstore                                            | Wings, rooms, drawers, closets, and optional extraction                         |
| Agent onboarding and reusable search workflow              | Rocket Agents library                               | Multi-client skills and linker pipeline                                         |
| Status and integrity diagnostics                           | Conversation transport and Memstore                 | Source inventory, schema/hash validation, and index diagnostics                 |
| Self-update and distribution                               | Rocket Agents                                       | `pnpm run update`, build, link, and release workflows                           |
| Unauthenticated LAN HTTP search                            | Deliberately excluded                               | Local CLI/MCP and SSH tunneling avoid a new unauthenticated server              |
| Native-provider transcript restore                         | Deliberately excluded                               | Canonical archives are retrieval/transport artifacts, not mutable client state  |

## Baseline differences

The strict BusiRocket baseline adds controls that neither reference defines as
the transport contract: atomic exported units, TypeScript strictness including
unchecked-index and exact-optional checks, architectural import boundaries,
secret redaction, traversal rejection, size limits, allowlisted SQLite tables,
content manifests, mode-0600 files, dry-run mutation gates, full project checks,
home-path redaction, and explicit supply-chain policy in `pnpm-workspace.yaml`.
Node 22.13 is enforced so SQLite-backed adapters use the built-in read-only
driver instead of shell interpolation or an additional native dependency.

## Acceptance boundary

Feature parity is measured at the Rocket Agents ecosystem boundary, not by
reproducing every command name from a monolithic reference. Transport, indexing,
knowledge organization, agent integration, and machine scheduling keep separate
owners. A capability counts as covered only when its owning component has a
runnable verification command.
