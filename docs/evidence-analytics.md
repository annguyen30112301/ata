# Evidence Analytics — design contract (v1.1)

Status: **design, not yet implemented.** This document is the *contract* of the subsystem — what it is,
what it may and may not do, and how it is allowed to evolve. Implementation follows this, not the reverse.

## The governing decision

> **Evidence Analytics is a read-only PROJECTION over evidence AVF already emits. It stores nothing and
> mints nothing.**

This is the one decision the document exists to lock. Analytics is not a new subsystem with its own
database; it is a *view*, in exactly the sense the Report Engine is a view of a verdict. `Report`,
`Dashboard`, and `Analytics` are three projections of **one** evidence set — so a single fixture drives all
of them, and none can drift from the source because none owns the source.

When time-series later requires persisted run history (v1.2+), the store is written by `run()` — not by
Analytics. Analytics stays a reader forever. If a change ever makes Analytics *write* evidence, the
boundary has broken.

## 1. Scope

**Analytics answers** (questions about the *accumulated evidence*, not about any single run):
- How many reports/reviews exist; which hypotheses and engines are covered.
- How verdicts distribute (how much SUPPORTED / INVALID / DEFER, by hypothesis and engine).
- Benchmark health: guard / regression / refutation totals, critical-confident-wrong count.
- Human oversight: confirm vs. override rate.

**Analytics does NOT answer** (out of scope by design):
- *Why* a single verdict is what it is — that is the Report Engine's job (one report, one view).
- Whether an engine is correct — that is the benchmark/kernel's job (Analytics never judges).
- Anything requiring data AVF does not yet emit: machine-verdict trend over time (needs a run log, v1.2+),
  connector evidence *quality* (needs a quality metric defined first — a research question, not v1.1).

Analytics reports *what the evidence says*; it never decides whether the evidence is right.

## 2. Data sources (only what already exists)

| Source | Fields Analytics reads | Nature |
|--------|------------------------|--------|
| `reports/<h>_<eng>_<ver>.json` | `benchmark.hypothesis` · `implementation.engine/verdict/critical_confident_wrong` · `counts{regression,preserved,guard,held,refutation,survived}` | Overwritten per run → **latest state only**, no history |
| `oracle/reviews.json` | `decision` (confirm/override) · `subject.hypothesis` · `verdict` · `timestamp` | Append-only + timestamped → history-capable |
| *run log* (v1.2+, not yet) | per-run `{run_id, timestamp, hypothesis, engine, verdict, counts}` | Append-only; **written by `run()`**, read by Analytics |

## 3. Architecture

```
Evidence (source of truth, unchanged)
   reports/*.json · oracle/reviews.json · [run log later]
        │  read only
        ▼
AnalyticsModel            each metric group computed + tested INDEPENDENTLY
   ├── Overview           counts: reports, reviews, hypotheses, engines
   ├── BenchmarkMetrics   verdict / hypothesis / engine distributions; case-role totals
   ├── ReviewMetrics      confirm vs override, rates, by hypothesis
   ├── RuleMetrics        (subsequent slice) derived: re-evaluate policy over reports — NOT stored
   └── TrendMetrics       (v1.2+) requires the run log
        │  assemble
        ▼
AnalyticsSnapshot         a plain DTO — the ONLY thing renderers see
        │
        ├─► dashboard/ (HTML)
        └─► json (API / the Analytics Test)
```

Two rules this shape enforces:
- **`AnalyticsSnapshot` is a DTO, nothing more.** It holds computed numbers; it contains no logic and knows
  no renderer. Adding a new metric family (connector, latency, cost…) adds a *sibling* under
  `AnalyticsModel` — it never widens a god object every renderer depends on.
- **Renderers consume the DTO only.** The dashboard never re-reads `reports/` or `reviews.json`; it renders
  the snapshot. (This also closes the earlier backlog item: split `dashboard` into model + HTML —
  `AnalyticsSnapshot` *is* that model.)

### AnalyticsSnapshot shape (v1.1, Slice 1)

```
AnalyticsSnapshot = {
  generated_at,
  overview:  { reports, reviews, hypotheses, engines },
  benchmark: {
    by_hypothesis:        { H0: <verdict>, … },
    verdict_distribution: { SUPPORTED: n, INVALID: n, DEFER: n, … },
    engine_distribution:  { "referential@v0.3": n, … },
    case_totals:          { regression, preserved, guard, held, refutation, survived, critical_confident_wrong }
  },
  review:    { total, confirm, override, confirm_rate, override_rate, by_hypothesis: { H5: {confirm,override}, … } }
}
```

No `rule` and no `trend` field in Slice 1 — they arrive in subsequent slices, added without changing the above.

## 4. Evolution

| Stage | Capability | New instrumentation |
|-------|-----------|---------------------|
| **v1.1** | read-only projection: Overview + Benchmark + Review metrics (Slice 1); then, in a subsequent slice, RuleMetrics (derived) | none — pure read |
| **v1.2+** | machine-verdict trends over time (TrendMetrics) | append-only run log, written by `run()` |
| **future** | connector evidence-quality metrics | a *definition* of quality first (may be its own hypothesis) |

Each stage is additive: it adds a metric family or a source, never rewrites the model or a renderer.

## Acceptance — the Analytics Test

> Given N reports and M reviews with **known** figures (fixtures), `AnalyticsSnapshot` computes the correct
> distributions and rates; and a person who has never seen the repo can read the rendered output and answer
> the scope questions above **without reading a raw report or review**.

**Invariant — determinism.** `AnalyticsSnapshot` is a pure function of its evidence inputs: identical
evidence produces an identical snapshot (save for the `generated_at` stamp). It never depends on render
time, the renderer, or the environment. `same evidence → same snapshot` is what makes it a projection
rather than a stateful subsystem — and it is directly testable (build the snapshot twice, compare).

Executable form (mirrors `report.test.mjs`): fixtures with hand-counted expected values → assert the
snapshot matches. Analytics is "done" when the numbers are provably correct from fixtures, not when a chart
looks finished.

## Slice 1 (first implementation, after this contract is ratified)

```
analytics/
  model.mjs         Overview + BenchmarkMetrics + ReviewMetrics → AnalyticsSnapshot (read-only)
  snapshot.test.mjs the Analytics Test, fixture-first
```

Explicitly excluded from Slice 1: RuleMetrics (layer 2), TrendMetrics, run log, dashboard refactor. Those
come only after the model + its test are green.
