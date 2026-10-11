# Segment archive v2, stage 3: cross-repository plan

Status: planned 2026-10-11. The first scribe slice of workstream 1 has landed
(`636c946`); everything else below is open.

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
- [ ] Plan from disk in bounded memory. The test fixture
      `planErasureAgainstArchive` collects every entry in memory, which is fine
      for fixtures and wrong for a multi-gigabyte corpus. Stream the entries and
      keep only the fragment hashes and conversation ids the plan needs.
- [ ] Redaction replacement. `reason: "redaction"` has to re-run the current
      redactor over the named conversations and publish the replacement
      fragments into the new base. Today apply only removes.
- [ ] `scribe erase plan|apply|verify|activate`, with `--root` required and no
      default, so the command cannot reach a live archive by omission. `plan`
      writes a reviewable JSON file; `apply` takes that file; `activate` names
      the generation id explicitly.
- [ ] Segment inventory: `scribe segments inventory --root <root> --json` prints
      the current generation id, the segment names and the four digests
      `verifyConversationSegmentArchive` already computes, so two hosts compare
      inventories without moving payload.
- [ ] Segment receive: `scribe segments receive --root <root> --from <staging>`
      validates each staged segment through the generation barrier before
      linking it in. A segment whose header names another generation, or a base
      segment the manifest does not name, is refused and left in staging.
      Generation mismatch between the two inventories refuses the whole
      exchange; only an explicit `seed-generation` copies a whole generation.
- [ ] The comma-joined `provenance.relativePath` (backlog item "Conversations
      export"): decide whether stage 3 carries it as an array. It changes
      fragment hashes, so if it lands it lands before the first live seed, never
      after.

### Dotfiles

- [ ] `sync-conversations <route> inventory|dry|sync|seed-generation` over
      segments: rsync only the names missing on the other side into a staging
      directory, then call `scribe segments receive`. The v1 path stays the
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

- [ ] `scribe segments export-pending --root <root> --state <state> --output     <file>`:
      materialize the conversations in `pending_deliveries` and write them as an
      ordinary export (header plus records), atomically.
- [ ] `scribe segments ack-pending --state <state> --slice <file>`: clear
      exactly the ids that slice carried, so a failed ingest redelivers them and
      nothing else.
- [ ] `scribe segments export-materialized --root <root> --output <file>`: the
      full export for rebuilds and for every refresh after a generation change.
- [ ] A contract fixture for the slice, under `fixtures/archive-contract/v2/`,
      that Atrium vendors the same way it vendors the full export.

### Atrium

- [ ] Ingest the vendored slice fixture with `--partial` in a test; assert the
      conversations it names are written and every other conversation is
      untouched.
- [ ] Decide whether `--partial` should call `mark_revision_backfill`, or state
      why it must not.
- [ ] Erasure propagation. A partial slice can add and replace conversations but
      never remove one, so after a generation change the refresh must run a full
      ingest of `export-materialized`; the sweep then removes the erased
      conversations. Test that, and that their vectors follow.
- [ ] Derived records. Synthesis records and episodes built from an erased
      conversation are not touched by the sweep. Decide how they are found and
      removed (or re-synthesized) when a generation drops a conversation, and
      test it.
- [ ] `atrium doctor` and the staleness checks read the v1 archive path today.
      Decide what they read after cutover: the materialized export, or the
      segment inventory.

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

- [ ] Segment capture, erasure apply and segment receive refuse to run while the
      sentinel exists, so a writer that bypasses the dotfiles wrappers is still
      stopped.

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

Proposed, for the owner to confirm before seeding:

| what                     | where                                                       |
| ------------------------ | ----------------------------------------------------------- |
| v1 archive (unchanged)   | `$SYNTOPICA_DATA/conversations/archive.jsonl`               |
| segment root             | `$SYNTOPICA_DATA/conversations/segments/`                   |
| disposable state         | `$HOME/.local/state/rocket-agents/conversations/`           |
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

- [ ] `scribe segments recovery-drill --root <copy> --work <dir>     --exercise-erasure --exercise-stale-peer`:
      delete the disposable state and rebuild it from segments; inject a
      synthetic target, erase it, verify; return a peer on the old generation
      and show it refused, then reseeded; activate the old generation and show
      the digests restored.
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
- the owner has confirmed the data location above.

```bash
cd "$HOME/p/scribe" && pnpm run check
cd "$HOME/p/atrium" && uv run pytest tests/ -q
cd "$HOME/p/dotfiles" && ./scripts/check
```

The commands the drill and gate name (`scribe erase`, `scribe segments …`,
`conversation-writers`, the segment modes of `sync-conversations`) do not exist
yet; they are the acceptance interfaces of the steps above.
