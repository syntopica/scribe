# Conversation transport runbook

The transport reads local agent history, emits a security-filtered canonical
archive, and verifies or merges received archives. It never modifies provider
state.

## Inventory

```bash
pnpm run conversations:doctor -- --json
```

Use repeatable `--source` flags, or a comma-separated value, to narrow the scan:

```bash
pnpm run conversations:doctor -- --source claude-code,codex --json
```

An unavailable optional source is reported with zero artifacts and does not fail
the command.

## Export

Choose an output path outside the repository. The parent directory is created
with private permissions, and the completed file is mode `0600`.

```bash
pnpm run conversations:export -- --source pi --output /tmp/scribe-pi.jsonl
```

The command fails without writing an export if any discovered artifact cannot be
read or parsed. Its JSON report includes the record count, redaction count,
per-source inventory, and manifest hash. It refuses to replace an existing
output unless `--force` is explicit.

Large Cursor databases are streamed through Node's built-in read-only SQLite
driver. Every source file or SQLite value is capped at 64 MiB, and the completed
export is written only after every artifact has passed parsing and redaction.
Export, import, and render stage records in a private temporary SQLite database,
so multi-gigabyte archives do not need to fit in the Node heap. Temporary
staging is removed on both success and failure.

## Verify and import

Imports are dry-runs unless `--apply` is explicit:

```bash
pnpm run conversations:import -- --input /tmp/scribe-pi.jsonl --archive /tmp/scribe-archive.jsonl
```

Apply only after reviewing `added`, `updated`, `duplicates`, and `errors`:

```bash
pnpm run conversations:import -- --input /tmp/scribe-pi.jsonl --archive /tmp/scribe-archive.jsonl --apply
```

If the archive exists, apply creates a timestamped mode-0600 backup beside it. A
hash mismatch, invalid record, unsafe provenance path, or unsupported schema
makes the import fail closed.

## Render

Rendering is a dry-run by default and writes one private Markdown file per
conversation only with `--apply`:

```bash
pnpm run conversations:render -- --input /tmp/scribe-archive.jsonl --output-dir /tmp/scribe-corpus
pnpm run conversations:render -- --input /tmp/scribe-archive.jsonl --output-dir /tmp/scribe-corpus --apply
```

Atrium does not need the rendered corpus: it ingests the canonical archive
directly (`atrium ingest <archive>`).

## Recovery drill

Rehearse recovery on a disposable copy of a segment archive, never on the live
one:

```bash
pnpm run scribe recovery-drill --root /tmp/drill/copy --work /tmp/drill/work \
  --exercise-erasure --exercise-stale-peer --migration-frozen
```

It records the `verify-segments` digests, deletes and rebuilds the state in
`--work`, injects and erases a synthetic marker conversation, shows a peer on
the old generation refused and then reseeded, and activates the original
generation again with every digest restored. The JSON report names each step
with its digests; the exit is 0 only when every step passed.

The guard has no override: `--root` and `--work` are required, and the drill
refuses either one inside or containing `$SYNTOPICA_DATA` (when set),
`$HOME/p/wiki` (always), `$HOME/p/wiki/conversations` or
`$HOME/.local/share/rocket-agents`; an unset or empty `HOME`; either one inside
the other; any symbolic link under the root, so the copy must be a real copy
(`cp -R`, not a tree of links); a non-empty `--work`; and a root with no active
generation.

The drill writes only inside `--root` and `--work`: the root gains the drill's
generations, its lock and reference, and transient `.seal-*` scratch, so discard
the copy afterwards; the state, the verifier's scratch state, the peer, the
exports and the erasure plan stay in `--work`. Like every writer it exits 75
while the migration freeze sentinel exists, unless `--migration-frozen` is
passed.

## Exchange between machines

Copy the canonical export with the existing authenticated SSH/rsync channel, run
a dry import on the receiver, and then apply it. Do not copy provider databases,
cookies, tokens, or index files. Host aliases and scheduling remain private
configuration in `dotfiles`. The complete ownership and prohibited-duplication
rules are documented in
[`../architecture/conversation-ownership.md`](../architecture/conversation-ownership.md).
