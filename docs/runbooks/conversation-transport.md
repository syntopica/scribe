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
pnpm run conversations:export -- --source pi --output /tmp/rocket-agents-pi.jsonl
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
pnpm run conversations:import -- --input /tmp/rocket-agents-pi.jsonl --archive /tmp/rocket-agents-archive.jsonl
```

Apply only after reviewing `added`, `updated`, `duplicates`, and `errors`:

```bash
pnpm run conversations:import -- --input /tmp/rocket-agents-pi.jsonl --archive /tmp/rocket-agents-archive.jsonl --apply
```

If the archive exists, apply creates a timestamped mode-0600 backup beside it. A
hash mismatch, invalid record, unsafe provenance path, or unsupported schema
makes the import fail closed.

## Render for Memstore

Rendering is a dry-run by default and writes one private Markdown file per
conversation only with `--apply`:

```bash
pnpm run conversations:render -- --input /tmp/rocket-agents-archive.jsonl --output-dir /tmp/rocket-agents-corpus
pnpm run conversations:render -- --input /tmp/rocket-agents-archive.jsonl --output-dir /tmp/rocket-agents-corpus --apply
```

Verify the handoff without changing the Memstore index:

```bash
memstore mine /tmp/rocket-agents-corpus --mode convos --wing rocket-agents-conversation-verify --limit 1 --dry-run
```

## Exchange between machines

Copy the canonical export with the existing authenticated SSH/rsync channel, run
a dry import on the receiver, and then apply it. Do not copy provider databases,
cookies, tokens, or Memstore storage. Host aliases and scheduling remain private
configuration in `dotfiles`. The complete ownership and prohibited-duplication
rules are documented in
[`../architecture/conversation-ownership.md`](../architecture/conversation-ownership.md).
