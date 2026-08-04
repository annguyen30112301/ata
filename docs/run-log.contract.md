# Run Log — design contract (v1.2)

Status: **design, not yet implemented.** This document is the *contract* of the run log — what it is, what
it may and may not do, and how it is allowed to evolve. Implementation follows this, not the reverse. It is
the source-of-truth this project locks BEFORE `run()` starts writing, because a renderer is cheap to change
and a persisted log format is not: once `run()` appends the first entry, the format lives for a long time.

## The governing decision

> **The run log is the append-only MACHINE HISTORY of AVF. Each entry is one invocation of `run()`, written
> once and never touched again. It is the ONLY history-capable machine source, and it is self-contained:
> the full trend of the project is reconstructable from the log alone.**

This is the one decision the document exists to lock — not a field list, a *semantic boundary*.

## 1. Why it exists — the gap it closes

Analytics already has two sources with two distinct natures:

| Source | Nature | Metrics it feeds |
|--------|--------|------------------|
| `reports/<h>_<eng>_<ver>.json` | **latest state** — overwritten every run, no history | Overview, BenchmarkMetrics |
| `oracle/reviews.json` | **human history** — append-only, timestamped | ReviewMetrics |
| **`run-log` (this contract)** | **machine history** — append-only, timestamped | **TrendMetrics** |

The three roles must not overlap. `reports/` answers *what is true now*; `reviews.json` answers *what humans
decided over time*; the run log answers *what the machine produced over time*. TrendMetrics — "is DEFER
rising?", "did this engine regress after the kernel changed?" — is impossible against `reports/` alone
because `reports/` keeps only the latest state. The run log is the missing time axis.

The three sources are **complementary, not substitutes** — the log is *added* alongside `reports/` and
`reviews.json`; it replaces neither. Three lines this contract never crosses:

- **TrendMetrics never reads `reports/`** — it reads the log (that is what makes the log replayable, §2.5).
- **ReviewMetrics never reads the log** — it reads `reviews.json` (machine history and human history are
  separate logs on purpose).
- **The run log never replaces `reports/`** — latest-state, per-case detail still lives there and still feeds
  Overview/Benchmark. The log adds a time axis; it does not absorb the other sources.

## 2. Invariants (the contract proper)

These bind the log for as long as the format exists. Every one is testable.

Each states the concrete failing test — *"if the implementation is wrong, which assertion goes red?"* — so
the acceptance suite (§6) is a mechanical encoding of this list, never a place where design is re-decided.

1. **One entry = one evaluate.** An entry records exactly one invocation of `run()` — not a benchmark, not an
   engine, not a report. Re-running the same hypothesis/engine appends a *new* entry; it never edits the old.
   *Red when:* two `run()` calls yield anything other than two appended entries.

2. **Immutable, append-only.** The log is only ever appended to — never updated, rewritten, deduplicated, or
   merged. A written entry is byte-identical forever after. (Same discipline as `reviews.json`.)
   *Red when:* after later appends, any byte of an earlier line has changed, or the line count is not monotonic.

3. **Write is read-free — the log is an append SINK, never an input.** The writer produces an entry WITHOUT
   reading the existing log; it treats the log purely as a destination to append to. Its mirror (the reader,
   §5) treats the log purely as a source — **no operation both reads and writes the log.** It follows that no
   field may depend on prior entries — no sequence counter, no `previous_verdict`, no running delta. This is
   what keeps append O(1), makes immutability trivially true, and makes concurrent runs safe.
   *Red when:* the bytes serialized for a fixed `verdict` differ between an empty log and a 10,000-line log.

4. **Self-contained.** An entry carries every datum TrendMetrics needs and points at NO mutable state — no
   `"report": "reports/h4_transition.json"` reference, because that file is overwritten and the trend would
   die. The entry stands alone.
   *Red when:* an entry holds a path/pointer into `reports/`, or a field TrendMetrics needs is absent from it.

5. **Replayable from the log alone.** TrendMetrics reconstructs from the run log ALONE — not the log *plus*
   `reports/` or `oracle/`. Delete `reports/` entirely and the full machine history still builds. This makes
   the log a *history source*, not a pointer index, and it holds the §1 boundary: trend reads the log, nothing
   else. It means the log does not *depend* on `reports/`; it does NOT mean `reports/` is redundant — that
   source still feeds Overview/Benchmark with latest-state detail the log deliberately omits. The dependency
   runs ONE way: **TrendMetrics adapts to the canonical entry (§3); the entry is never widened to fit
   TrendMetrics.** Source first, projection second.
   *Red when:* (beat 1, now) a canonical entry is missing a §3 field, so it is not self-sufficient; (beat 2,
   once TrendMetrics exists) a trend built from `runs.jsonl` **alone**, with `reports/` deleted, differs from
   the reference trend.

6. **Data only, no presentation.** An entry holds numbers and identifiers — no display text, markdown,
   rendered report, or dashboard field. Renderers compute from the entry; the entry pre-computes nothing for
   them. (Same rule that keeps `AnalyticsSnapshot` a DTO.)
   *Red when:* an entry carries a rendered/markdown/display field instead of raw data.

7. **Deterministic downstream.** TrendMetrics is a pure function of the log: identical log → identical trend
   (save for any render-time stamp). The determinism invariant of Evidence Analytics, carried onto the log.
   *Red when* (beat 2, once TrendMetrics exists)*:* the same fixed log yields two different trends.

A corollary of (3)+(6): the entry is deliberately **flat**. It does NOT reuse the report's nested
`{ benchmark, implementation }` objects, so the report's internal structure may change without forcing a log
migration. The log's shape is a contract; the report's shape is an implementation detail.

## 3. Entry shape (v1.2)

Canonical key order — identity, subject, verdicts, quality, volume, provenance. New fields APPEND at the end
(never insert between) so a JSONL diff stays stable.

```json
{
  "run_id": "5f3c…",                       // uuid — the identity of this one run()
  "timestamp": "2026-08-04T04:35:10.352Z", // ISO-8601 — the time axis of every trend
  "hypothesis": "H4",                       // which hypothesis was evaluated
  "engine": "transition@v0.1",              // which engine@version produced the verdict
  "benchmark_verdict": "SUPPORTED (constructive)", // benchmark-owned (constant per hypothesis)
  "implementation_verdict": "SUPPORTED",    // engine-owned (the one that moves run to run)
  "critical_confident_wrong": 0,            // the quality metric — kept, not re-derived later
  "counts": { "regression": 6, "preserved": 6, "guard": 1, "held": 1, "refutation": 2, "survived": 2 },
  "framework_version": "0.1.0"              // kernel identity — explains jumps after a kernel change
}
```

Every field is available in the `verdict` object `run()` already assembles — the writer is a pure projection
appended at the end of the pipeline, computing nothing new:

| entry field | source in `run()` |
|-------------|-------------------|
| `run_id`, `timestamp`, `framework_version` | `verdict.run.*` |
| `hypothesis`, `benchmark_verdict` | `verdict.benchmark.{hypothesis,verdict}` |
| `engine`, `implementation_verdict`, `critical_confident_wrong` | `verdict.implementation.{engine,verdict,critical_confident_wrong}` |
| `counts` | `verdict.counts` |

### Why these fields, and why not the others

**The one deciding question — source or projection?** — governs every field, now and for any future
addition. A **source fact** is a raw datum the run itself emitted (kernel or benchmark output at evaluate
time), immutable once produced. A **projection** is computed *later* by a reader, from sources, under a
policy or interpretation — so it changes when that policy/interpretation changes. **The log stores only
source facts;** projections are recomputed by readers and never persisted here. A field is also excluded if
it is a source fact but belongs to a *different* source (§1). Adding a field later means answering this same
question — is it a fact this run emitted, or something a reader computes? — not "would it be handy on a chart".

**The operational test** (sharper than the question, and the one to apply to any proposed field): *if a value
can change by changing only the reader, the policy, or the context — WITHOUT re-running `run()` — it is a
projection, and it must not be written to the run log.* Walk the fields by it: `implementation_verdict`,
`benchmark_verdict`, `critical_confident_wrong` are unmoved by any policy → **source**; `would_block`,
`action`, `rule` all move the moment the policy moves → **projection**. `benchmark_verdict` in particular is
the *benchmark verdict observed at the time of the run* — a historical fact, not "the benchmark's current
verdict"; it stays pinned in the log even after the benchmark later evolves.

**In — source facts this run emitted:**
- `benchmark_verdict` AND `implementation_verdict`, kept **separate** — trend must distinguish the
  human-owned hypothesis verdict (constant per hypothesis) from the engine verdict (what actually moves run
  to run). Recording `benchmark_verdict` as-of-run also snapshots what the hypothesis asserted at that time,
  independent of any later benchmark edit.
- `critical_confident_wrong` — a kernel output of this run (not a reader's computation) and a first-class
  Analytics quality metric today; if the log omitted it, TrendMetrics would have to re-derive it or read
  stale reports, breaking replayability (§2.5).
- `framework_version` — kernel identity at run time; explains discontinuities (a step change right after the
  kernel version moved is a kernel effect, not an engine regression).

**Out — a projection (a reader computes it; it is not a fact of the run):**
- `rule`, `would_block`, `action` → **RuleMetrics**, computed from a report under a policy + context; both
  can change, so the value is not a fact of the run. Recomputed on read, never stored.
- `name`, `kind`, `capabilities` → static metadata derivable from the stored `engine`/`hypothesis` identity;
  redundant to persist.

**Out — a source fact, but of a *different* source (§1 boundary):**
- per-case `cases[]`, `reason` → the **report** (`reports/`): latest-state, per-case detail and explanation.
- `decision`, confirm/override → the **Oracle** (`reviews.json`): *human* history, a separate append-only log.

**Considered and deferred:** `schema_version` (the benchmark schema, also stamped on `verdict.run`). A source
fact — so eligible — but left out of v1.2 because `framework_version` already explains kernel-driven jumps;
it can be appended later (§2 order rule makes that non-breaking) if benchmark-schema changes ever need to be
read off the trend.

## 4. Storage format & location

**Format: JSONL** (one JSON object per line) at **`run-log/runs.jsonl`**.

JSONL — not a single JSON array like `reviews.json` — because it realizes invariant (2) at the filesystem
level: a write is literally `appendFile(JSON.stringify(entry) + '\n')`. No read, no parse, no whole-file
rewrite; a crash mid-write corrupts at most the final line, which the reader skips. A JSON array would force
read→push→stringify→overwrite on every run — a rewrite, which is a weaker basis for an immutability claim.

Location is **outside `reports/`** deliberately so the *code* of the subsystem (`run-log/model.mjs`,
`store.mjs`, the test) has its own home; `run-log/` is its own directory (room for later rotation).

**Git & packaging (ratified):** `run-log/runs.jsonl` is **`.gitignore`d** — like `reports/` and
`dashboard/index.html`. The *code* under `run-log/` is committed and, once `run()` imports it, shipped in the
npm `files` list; only the generated `runs.jsonl` is ignored. A fresh clone starts with an empty log and
accumulates history as the machine runs — the symmetry `reports/` already has (empty on clone, regenerated by
running). TrendMetrics on a fresh clone simply reports "no history yet", the same way Analytics already
reports zero for an empty `reports/`. The log is *durable across runs* (append-only, never overwritten) but
not *tracked in git*.

The deeper reason — not "avoid a git diff": **`run()` is a primitive, not a historical event.** It is called
by production *and* by the test harness (`test:cli`, `test:examples` drive it against the real root), so not
every invocation is architecturally meaningful. A **canonical, committed history should contain only events
that mean something** — and today the log cannot tell an "official evolution run" from an "internal test
invocation". Until a layer draws that line, the log stays local: honest machine history for whoever ran it,
not a claim about the project's evolution. Committing the log becomes meaningful only once such a distinction
exists (a future capability, not v1.2).

> This refines the earlier "commit it" lean: at ratification `run()` was not yet the writer, so we had not
> seen that every test invocation appends. Once concrete, two things settled it — the `reports/` precedent
> (ignore what `run()` regenerates), and the sharper principle above (a primitive's every firing is not
> history).

## 5. Reader contract

A tolerant reader (`loadRunLog(root)`, later) parses each non-empty line, **skips** a malformed line rather
than crashing, and returns `[]` for a missing file — the same never-fail-for-absence tolerance
`loadEvidence` already applies to `reports/`. Analytics stays a **reader forever**: it never writes the log,
exactly as it never writes `reports/` or `reviews.json`. `run()` is the sole writer of machine history.

## 6. Acceptance — the Run Log Test

`run-log.test.mjs` (fixture-first, mirrors `snapshot.test.mjs`) is a mechanical encoding of §2 — one bar per
invariant, each the `Red when` made executable. Bars needing TrendMetrics (which does not exist yet) are
marked **beat 2** and land with it; the rest are testable **now**, before `run()` writes anything.

| # | Bar | Invariant | When |
|---|-----|-----------|------|
| 1 | **Shape** — an entry has exactly the canonical keys of §3, correct types, canonical order | §3 | now |
| 2 | **One entry = one evaluate** — N runs ⇒ N appended entries | inv 1 | now |
| 3 | **Append-only / immutable** — appending M more leaves the first N lines byte-identical, yields N+M lines | inv 2 | now |
| 4 | **Write is read-free** — bytes for a fixed `verdict` are identical whether the log is empty or already large | inv 3 | now |
| 5 | **Self-contained** — no entry points into `reports/`; each carries the full field set | inv 4 | now |
| 6 | **Replayable (shape completeness)** — every canonical RunLogEntry field required by §3 is present; the entry is self-sufficient (TrendMetrics adapts to it, not the reverse) | inv 5, beat 1 | now |
| 7 | **Data only** — no presentation/markdown/rendered field appears on an entry | inv 6 | now |
| 8 | **Tolerant reader** — a malformed line is skipped (not fatal); a missing file reads as empty | §5 | now |
| 9 | **Replayable (behavior)** — a trend built from `runs.jsonl` **alone** (with `reports/` deleted) equals the reference trend | inv 5, beat 2 | with TrendMetrics |
| 10 | **Deterministic downstream** — a fixed log yields one identical trend | inv 7 | with TrendMetrics |

Splitting Replayable into 6 (shape completeness, now) and 9 (behavior, later) is deliberate: the first test
must not be blocked on a TrendMetrics that does not exist. Beat 1 locks that the entry *carries enough*;
beat 2, once TrendMetrics exists, locks that a trend *actually builds from the log alone*.

The bar is the same as everywhere else in AVF: the log is "done" when these are provably true from fixtures —
not when a trend chart looks finished.

## 7. Evolution & implementation order

```
run-log.contract.md   (this doc — ratify first)
      ↓
run-log.test.mjs      (encode §6 against fixtures, before run() writes anything)
      ↓
run() append writer   (one appendFile at the very end of the pipeline; run() stays the sole writer)
      ↓
TrendMetrics          (a new metric family under AnalyticsModel — sibling, not a rewrite)
      ↓
AnalyticsSnapshot.trend   (appended after `rule`, per the canonical order rule)
      ↓
Dashboard             (consume trend — additive; degrades if the log is absent)
      ↓
analytics.html        (a renderer, last — always writable after the model is stable)
```

Each stage is additive: it adds a source, a metric family, or a renderer — it never rewrites the model or an
existing renderer. The append writer is the ONLY change to `run()`, and it is the last side effect in the
pipeline, so a failure to append never blocks the report `run()` already writes.
