# Segment archive v2, stage 3: cross-repository plan

Status: planned 2026-10-11. Landed in scribe: the erasure apply/verify slice
(`636c946`), and the Atrium contract (erasure plan, inventory, pending slice)
with its commands (see "Contracts with Atrium"). Everything not ticked below is
open. Data location decided 2026-10-11 (owner, relayed by the coordinator); see
workstream 4.

Stage 3 completes what stage 2 left out: erasure, transport between
installations, handing the pending slice to Atrium, and the writer freeze. It
then prepares the data location and rollback drill that a live cutover needs.
The format and its reasoning are in Atrium's
`docs/designs/conversation-archive-decision.md` (stages 3-8) and
`docs/designs/scribe-split.md` (phase 7). This file is the execution order and
the verification each step has to pass. It does not change the format.

Three repositories take part, and each owns its own side:

| repository | owns                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| scribe     | the segment format, erasure, the segment inventory and receive, the pending slice     |
| atrium     | `atrium ingest --partial` over the slice, full reconciliation, derived-record cleanup |
| dotfiles   | the refresh pipeline, `sync-conversations`, schedulers, the SessionEnd hook, freeze   |

## Ground rules

- No live data is touched until workstream 4's gate passes. Workstreams 1-3 run
  only on disposable roots that the tests create.
- No archive rewrite. The v1 `archive.jsonl`, its backups and the transfer files
  stay exactly as they are through cutover and the retention window after it.
- The wire format Atrium reads (`rocket-agents-conversation-export` header,
  event ids, timestamp normalisation) does not change in stage 3. The pending
  slice is an ordinary export file with that header.
- Purging an old generation, the v1 archive or a backup is a separate
  destructive decision with an exact target inventory. Nothing in this plan does
  it.

## Contracts with Atrium

Pinned by `scripts/lib/conversations/ARCHIVE_CONTRACT_FIXTURE_TEST.ts` against
committed files in `fixtures/archive-contract/v2/`, regenerated together with
`pnpm contract:fixture`. Renaming a field below breaks Atrium.

**Erasure plan** (`erasure-plan.json`, the plan as written after apply).
Atrium's `atrium erase --plan <file>` reads `conversationIds`.

| field              | type                                        | meaning                                                                                                                                                                |
| ------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`             | `"rocket-agents-conversation-erasure-plan"` | identifies the file                                                                                                                                                    |
| `schemaVersion`    | `2`                                         |                                                                                                                                                                        |
| `fromGenerationId` | string (64 hex)                             | the generation the plan was computed against; apply refuses any other                                                                                                  |
| `toGenerationId`   | string (64 hex), optional                   | the generation applying the plan produced; absent until applied, because the id derives from the rewritten bytes                                                       |
| `segmentSetSha256` | string (64 hex)                             | digest of the segment names the plan saw; apply refuses a moved archive                                                                                                |
| `createdAt`        | ISO 8601 string                             |                                                                                                                                                                        |
| `reason`           | `"erasure"`, `"redaction"` or `"pack"`      |                                                                                                                                                                        |
| `redactorSha256`   | string (64 hex), optional                   | present on a `redaction` plan alone: fingerprint of the redactor it was computed with; apply refuses the plan once the redactor has changed. Atrium does not read it   |
| `conversationIds`  | string[], sorted                            | every conversation the plan removes any fragment of, including one that keeps other fragments: a synthesis built from an erased fragment carries its text either way   |
| `conversations`    | object[]                                    | per conversation: `conversationId`, `removedFragmentSha256` (sorted), `removesConversation` (true when nothing of it remains); same order and ids as `conversationIds` |

**Segment inventory**
(`scribe segments-inventory --root <root> --state <state>`, JSON on stdout).
Atrium reads `generationId` and `pendingDeliveries`: its index is stale when
`generationId` differs from the generation it last ingested or when
`pendingDeliveries` is not zero. The other keys are `baseSegments` (count),
`segments` (sorted names), `segmentSetSha256` and `conversations` (count).

**Pending slice** (`pending-slice.jsonl`). An ordinary export: the
`rocket-agents-conversation-export` manifest line, then one materialized record
per line. The fixture holds the Claude Code conversation of `export.jsonl`
alone, a strict subset, for Atrium's `ingest --partial` test. Its records are
materialized from the fragment set, so `provenance.contentSha256` is the
fragment-set provenance and differs from the v1 export's value for the same
conversation, and `provenance.relativePath` is an array where the v1 export has
a string (see below); ids, events and every other field are equal.

**`provenance.relativePath`** (since 2026-10-18). In every v2 record - segment
fragments, `export-materialized`, `export-pending` - it is a `string[]`: every
source path the conversation was read from, relative to the home, sorted
(`localeCompare`), unique, at least one entry, each entry neither absolute nor
traversing (`isSafeConversationRelativePath`). A record that breaks this is
refused on read. The v1 archive, its transfer files and `scribe export` keep the
comma-joined string until cutover, byte for byte: a peer still on the v1 reader
rejects an array, and the v1 export's bytes and manifest hash are what Atrium
has already ingested. Per-record `contentSha256` never covered the path in v1 (a
source-content hash, or a hash of hashes after a merge), so it does not move
there. In v2 it does: the fragment hash covers the canonical record, so the
fragment-set `contentSha256` of every materialized record changed with this
format. Reading v1 data (`scribe migrate-segments`, `import`, `rewrite`) splits
the joined string once and accepts what v1 accepted (the whole string checked as
one path); the v1 merge keeps the v1 string algorithm, so v1 bytes match the
code before this change for any input. Migration into v2 drops each empty,
absolute or traversing entry and refuses a record left with none. Segments
written before this change (string `relativePath`, old fragment hashes) are
unreadable and must be re-migrated from the v1 archive; none exist live. Atrium
does not read this field.

**Generation stamp on materialized exports.** The manifest line of every
`export-materialized` and `export-pending` file carries two more fields after
`contentSha256`:

| field               | type                   | meaning                                                                 |
| ------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `generationId`      | string (64 hex)        | the generation the export was materialized from                         |
| `generationLineage` | string[], newest first | that generation's ancestors: its parent, the parent's parent, and so on |

Generation ids are content hashes and cannot be ordered, so Atrium accepts an
erase only when the plan's `toGenerationId` is the export's `generationId` or
appears in its `generationLineage`. The lineage comes from `parentGenerationId`
in each `generation.json`, which an erasure records as the generation it was
applied to (since 2026-10-11; it is not part of the generation id). The walk
ends at a generation that records no parent - one migrated from v1, initialized
empty, or sealed before parents were recorded - or whose manifest this
installation no longer holds, for example after a purge. A lineage can therefore
be shorter than the true history, never wrong; an empty array means no ancestor
is known. v1 exports (`scribe export`) carry neither field.
`materialized-after-erasure.jsonl` is the full export after the contract erasure
is cut over: its `generationId` is `erasure-plan.json`'s `toGenerationId` and
its lineage is `[fromGenerationId]`. The pending slice fixture comes from a
store initialized empty, so its lineage is `[]`.

## Order

1. Erasure and transport (scribe, then the dotfiles transport wrapper).
2. Atrium partial ingest of the pending slice.
3. Dotfiles freeze support.
4. Data location and rollback drill, then the cutover gate.

Each workstream starts only when the one before it passes its verification.

## Workstream 1: erasure and transport

### Scribe

- [x] Seal a generation without selecting it, and select a held generation as a
      separate step (`sealConversationArchiveGeneration`,
      `activateConversationArchiveGeneration`). Selecting the old id again is
      the rollback. `636c946`.
- [x] `applyConversationArchiveErasure`: refuses a plan whose generation or
      segment set has moved; rewrites every surviving fragment, hosts included,
      into a new chunked base; selects nothing. `636c946`.
- [x] `verifyConversationArchiveErasure`: the new generation is the old one
      minus exactly the planned fragments, as fragment sets; segments from
      another generation are reported, not counted. `636c946`.
- [x] Plan from disk in bounded memory: `planConversationArchiveErasureFromRoot`
      reads one segment at a time and keeps only conversation ids and fragment
      hashes. The plan carries `conversationIds` and, once applied,
      `toGenerationId` (`recordConversationErasureTarget`).
- [x] Redaction replacement (2026-10-18). `reason: "redaction"` plans run the
      current redactor (`redactConversationRecord`: title, workspace and event
      texts, event ids kept) and name only the fragments it would change, and
      only conversations with at least one;
      `scribe erase plan --reason redaction` reports clean requested ids as
      `unchangedConversationIds` and writes no plan when nothing would change.
      The plan carries `redactorSha256`; apply refuses it once the redactor has
      changed and seals each planned fragment's replacement in its place in the
      new base. Verify recomputes the replacements from the old generation and
      checks old minus planned plus replacements, that no replacement still
      matches the patterns, and that no redacted-away value appears in any
      string of any fragment of the new generation; a secret in a field the
      redactor cannot rewrite (ids, paths, hosts) fails as unredactable, and
      plan reports it as `unredactableConversationIds`.
      `CONVERSATION_ARCHIVE_REDACTION_TEST.ts`, `SCRIBE_ERASE_CLI_TEST.ts`.
- [x] `scribe erase plan|apply|verify|activate` (2026-10-18), with `--root`
      required and no default, so the command cannot reach a live archive by
      omission. `plan` writes a reviewable JSON file; `apply` takes that file;
      `activate` names the generation id explicitly.
- [x] Segment inventory:
      `scribe segments-inventory --root <root> --state <state>` prints the keys
      under "Contracts with Atrium". It replays no payload it has already
      indexed; the four full digests stay in `verify-segments`.
- [x] Segment receive: `scribe segments-receive --root <root> --from <staging>`
      validates each staged segment through the generation barrier before
      linking it in. A segment whose header names another generation, or a base
      segment the manifest does not name, is refused and left in staging.
      Generation mismatch between the two inventories refuses the whole
      exchange; only an explicit `seed-generation` copies a whole generation.
      Landed 2026-10-18. `<staging>` is flat: `s_<sha256>.jsonl` files, as the
      transport copies the names the receiver lacks. `--expect-generation <id>`
      is required and takes the sender's inventory `generationId`; a mismatch
      refuses the whole exchange before any file is read. Under the archive
      write lock each file is checked (name is the content digest, the segment
      validates, header is this generation or a base segment its manifest
      names), published (fsync, link, directory fsync) and only then removed
      from staging; refused files stay with a reason; a staging directory inside
      the root (by realpath) is refused; hidden names (rsync temporaries) are
      ignored. An already-linked segment is re-hashed and synced, then
      `alreadyPresent` (a corrupt one is refused as `destination corrupt` and
      the staged copy kept), so a stopped receive finishes on rerun. JSON report
      on stdout (`generationId`, `received`, `alreadyPresent`,
      `refused[{name,reason}]`, `ignored`, and `refusedExchange` when refused
      whole); exit 1 when anything was refused. The state is not touched: the
      next command that opens it replays the new segments and marks their
      conversations pending.
      `scribe segments-seed-generation --root <root> --from <staging> --generation <id>`
      is the `seed-generation`: `<staging>` has the archive layout,
      `generations/g_<id>/{generation.json,segments/}`; the id must be the one
      the base segments derive, every base segment must be staged and every
      staged segment must pass the barrier, or nothing is seeded; the validated
      manifest is written, not re-read. It selects nothing; activation is
      `scribe erase activate --root <root> --generation <id>` (the same step as
      an erasure cutover and its rollback), which takes the archive write lock.
      `CONVERSATION_SEGMENT_RECEIVE_TEST.ts` (four installations, tampered,
      interrupted, seed refusals), `SCRIBE_SEGMENTS_RECEIVE_CLI_TEST.ts`.
- [x] `provenance.relativePath` is a sorted, unique `string[]` in the v2 model
      (2026-10-18), before the first live seed because it changes fragment
      hashes. Each entry is validated; an empty array is refused; v1 data is
      split once on read and the v1 wire form stays the joined string (see
      "Contracts with Atrium"). State schema 5 replays any older state (5:
      same-timestamp events keep source order).

### Dotfiles

- [ ] `sync-conversations <route> inventory|dry|sync|seed-generation` over
      segments: rsync only the names missing on the other side into a staging
      directory, then call `scribe segments-receive`. The v1 path stays the
      default until cutover.
- [ ] Both routes to the same laptop must report one installation; tests cover
      both aliases.

### Verification

```bash
cd "$HOME/p/scribe" && pnpm run check
cd "$HOME/p/scribe" && npx tsx --test \
  scripts/lib/conversations/CONVERSATION_ARCHIVE_ERASURE_TEST.ts \
  scripts/lib/conversations/CONVERSATION_ARCHIVE_ERASURE_APPLY_TEST.ts \
  scripts/lib/conversations/CONVERSATION_SEGMENT_PUBLICATION_TEST.ts
```

Once the transport lands, a test that builds four isolated installations in
temporary homes must show: interrupted transfer resumes; a stale peer on the old
generation is refused and converges only through `seed-generation`; an immediate
dry run after sync reports zero missing segments and identical generation id,
segment-set, conversation-id, event-set and materialized-state digests on all
four.

## Workstream 2: Atrium partial ingest

What exists, read from Atrium on 2026-10-11: `atrium ingest --partial <file>`
runs the same per-conversation upsert as a full ingest and skips the
provider-scoped absence sweep and the revision backfill mark
(`atrium/commands/run_ingest.py`). The reader skips the export header and reads
every other line as a conversation (`atrium/ingest/read_archive.py`).

### Scribe

- [x] `scribe export-pending --root <root> --state <state> --output <file>`:
      writes the conversations in `pending_deliveries`, materialized, as an
      ordinary export, streamed and renamed into place.
- [x] `scribe ack-pending --root <root> --state <state> --slice <file>`: clears
      a pending id only when the slice carries exactly the record the archive
      materializes now; one captured or synced again after the slice was written
      stays pending and is reported as `stale`.
- [x] `scribe export-materialized --root <root> --state <state> --output <file>`:
      the full export, streamed from the state in id order.
- [x] Segments replayed into the state from elsewhere (a sync, a seed, a lost
      state) are marked pending, so Atrium receives what a peer contributed.
- [x] The slice contract fixture:
      `fixtures/archive-contract/v2/pending-slice.jsonl`.
- All four commands require `--root` and `--state` with no default: opening a
  state for another generation discards it, so a default could reach the live
  state by omission.

### Atrium

- [x] (Atrium `tests/test_scribe_segment_contract.py`) Ingest the vendored slice
      fixture with `--partial` in a test; assert the conversations it names are
      written and every other conversation is untouched.
- [x] Decide whether `--partial` should call `mark_revision_backfill`, or state
      why it must not. Decided in Atrium: it must not, because the stamp claims
      revisions cover every archived conversation and a slice covers a subset.
- [x] (Atrium: a full ingest after a generation change removes the erased
      conversation's rows, revision and vectors) Erasure propagation. A partial
      slice can add and replace conversations but never remove one, so after a
      generation change the refresh must run a full ingest of
      `export-materialized`; the sweep then removes the erased conversations.
      Test that, and that their vectors follow.
- [x] (Atrium `atrium erase --plan <applied plan> [--apply]`) Derived records.
      Synthesis records and episodes built from an erased conversation are not
      touched by the sweep. Decide how they are found and removed (or
      re-synthesized) when a generation drops a conversation, and test it.
- [x] (Atrium 2026-10-16: `doctor --segment-inventory <file>` warns
      `archive_generation_stale` / `archive_deliveries_pending`; the refresh
      wiring is a dotfiles item) `atrium doctor` and the staleness checks read
      the v1 archive path today. Decide what they read after cutover: the
      materialized export, or the segment inventory.

### Verification

```bash
cd "$HOME/p/atrium" && \
uv run ruff check . && \
uv run ruff format --check . && \
uv run pytest tests/ -q
cd "$HOME/p/scribe" && pnpm run check
```

## Workstream 3: dotfiles freeze support

### Dotfiles

- [ ] A freeze sentinel at
      `$HOME/.local/state/rocket-agents/conversations/migration.freeze`. The
      refresh script, both halves of `sync-conversations`, `sync-all-safe` and
      the Claude SessionEnd hook check it first and exit 0 with a logged
      `frozen` line when it is present. Today none of them checks it.
- [ ] `conversation-writers freeze|unfreeze|verify-frozen|verify-running`, per
      trigger and `--all-peers`. Freezing waits for running writers rather than
      terminating them.
- [ ] The refresh pipeline in segment mode: one capture, `export-pending`,
      `atrium ingest --partial`, `ack-pending`; a full `export-materialized` and
      full ingest when the generation id changed since the last refresh. The v1
      pipeline stays the default until cutover.

### Scribe

- [x] Segment capture, erasure apply and segment receive refuse to run while the
      sentinel exists, so a writer that bypasses the dotfiles wrappers is still
      stopped (`a3b8a34`). Dotfiles has not adopted exit 75 yet; that is its
      item.

Where scribe looks: `$ROCKET_AGENTS_CONVERSATION_STATE/migration.freeze`, else
`$HOME/.local/state/rocket-agents/conversations/migration.freeze`
(`conversationFreezeSentinelPath`). That is the variable and default
`sync-conversations` already uses for its state directory, so both sides name
one file. It is not derived from `--state` or `--root`: a writer that bypasses
the wrappers passes neither the way the wrappers do, and a flag that moved the
sentinel would be a way around the freeze. As in the wrapper's
`${VAR:-default}`, an empty value means unset; a relative one is refused.
`XDG_STATE_HOME` is not consulted, because dotfiles does not consult it. Tests
set the variable to a scratch directory; `pnpm run conversations:test` points it
at a path that never exists.

What refuses: `capture`, `export` (the v1 provider capture the live refresh runs
today), `import --apply`, `rewrite --apply`, `migrate-segments`,
`segments-receive`, `segments-seed-generation`, `erase apply` and
`erase activate`. Each checks before any work and again once the archive write
lock is held (`withArchiveWriteLock`), so a freeze that lands while a writer
waits wins. `migrate-segments` and `capture --init` select their generation
under that lock, and v1 `export`, which takes no lock, checks again just before
its rename. Refusal is exit 75 (EX_TEMPFAIL) with one stderr line starting
`frozen:`, distinct from usage (2) and failure (1). Readers (`verify-segments`,
`segments-inventory`, `export-pending`, `export-materialized`, `erase plan`,
`erase verify`, dry-run `import` and `rewrite`) still run.

Stages 5 and 6 of the decision run import, migration, seed, receive and
activation inside the freeze. Those commands accept `--migration-frozen`, the
flag the decision already gives `sync-conversations`, to run while frozen.
`capture`, `export` and `rewrite` have no such flag: no provider capture happens
inside the freeze.

### Verification

```bash
cd "$HOME/p/dotfiles" && ./scripts/check
cd "$HOME/p/scribe" && pnpm run check
```

Plus an isolated-home test that creates the sentinel, runs every trigger, and
shows each one exiting 0 without writing; and one that removes it and shows them
running again.

## Workstream 4: data location and rollback drill

### Data location

Decided 2026-10-11 (owner, relayed by the coordinator). These paths are final:

| what                     | where                                                       |
| ------------------------ | ----------------------------------------------------------- |
| v1 archive (unchanged)   | `$SYNTOPICA_DATA/conversations/archive.jsonl`               |
| segment root             | `$SYNTOPICA_DATA/conversations/segments/`                   |
| disposable state, locks  | `$HOME/.local/state/rocket-agents/conversations/`           |
| freeze sentinel, reports | `$HOME/.local/state/rocket-agents/conversations/migration*` |

The original design put the segment root under
`$HOME/.local/share/rocket-agents/conversations/`; that predates the instance
directory. Keeping the segments beside the v1 archive means one volume (hard
link publication cannot cross volumes), one backup scope, and the instance's
existing ignore rule for `/conversations/`, which keeps the segments out of the
instance's Git history. The state directory stays where both locks already live.

Space: the seed needs about one more archive's worth for the base, and an
erasure rewrite another. The decision's free-space rule (three times the frozen
archive plus 2 GiB) is measured on every holder at preflight, not assumed.

### Rollback

Until a separate purge decision, rollback is cheap and has two levels:

1. Generation rollback: `activate` the previous generation id. The old
   generation's directory is never removed by cutover.
2. Format rollback: point the refresh pipeline back at the v1 path. The v1
   archive is not modified by any stage-3 step, so it is the state it was at
   freeze.

### Drill, on a disposable copy

- [x] `scribe recovery-drill --root <copy> --work <dir>     --exercise-erasure --exercise-stale-peer`:
      delete the disposable state and rebuild it from segments; inject a
      synthetic target, erase it, verify; return a peer on the old generation
      and show it refused, then reseeded; activate the old generation and show
      the digests restored. (2026-10-18) Steps `baseline`, `rebuild`, `erasure`,
      `stale-peer`, `rollback` in one JSON report; exit 0 only when all pass.
      The target is injected as a sealed child generation, so the original
      generation is never written and rollback equals the baseline exactly.
      Refuses, with no override, a root or work directory overlapping
      `$SYNTOPICA_DATA`, `$HOME/p/wiki/conversations` or
      `$HOME/.local/share/rocket-agents`, and work and root inside each other;
      takes `--migration-frozen` because it is rehearsed inside the freeze.
- [ ] Rebuild a test Atrium index from `export-materialized` and compare raw
      records, both FTS lanes, synthesis records and vector identities against
      the live index's inventory.

### Cutover gate

The live cutover is the decision document's stages 4-8 and starts only when all
of these hold:

- workstreams 1-3 verified, and every holder runs the same scribe, Atrium and
  dotfiles commits;
- parity: a migration of a frozen copy of the v1 archive verifies, and its
  semantic inventory equals the v1 inventory by id, event bytes, metadata and
  provenance;
- recoverability: the drill passes on a copy of that migration, including
  rollback to the previous generation and to v1;
- every holder is reachable and passes the free-space rule;
- the data location above (decided 2026-10-11) is what every holder uses.

```bash
cd "$HOME/p/scribe" && pnpm run check
cd "$HOME/p/atrium" && uv run pytest tests/ -q
cd "$HOME/p/dotfiles" && ./scripts/check
```

The commands the drill and gate name (`scribe erase`, `segments-receive`,
`recovery-drill`, `conversation-writers`, the segment modes of
`sync-conversations`) do not exist yet; they are the acceptance interfaces of
the steps above.
