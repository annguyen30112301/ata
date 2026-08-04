# 1. AnalyticsSnapshot is the sole contract between the Analytics model and its consumers

Status: **Accepted** — 2026-08-04

## Context

Evidence Analytics began as the dashboard's private computation. As it grew — RuleMetrics, then a Run Log and
TrendMetrics — and gained more outputs — a JSON artifact, the dashboard summary, a standalone HTML explorer —
it stopped being an implementation detail of one renderer and became a subsystem with several consumers.

Without a boundary, that growth has a predictable failure mode: each renderer re-reads `reports/`,
`reviews.json`, or the run log for the extra field it wants, every consumer drifts from the source, and a new
metric widens a god object that everything depends on. The question this record settles is *what every
consumer is allowed to depend on.*

## Decision

**`AnalyticsSnapshot` — a plain DTO produced by the pure Analytics model — is the ONE contract between the
model and every consumer.**

- The **model owns all logic**; the **snapshot owns all data**; a **consumer owns only presentation**.
- A consumer MUST build from the snapshot alone. It MUST NOT read `reports/`, `oracle/reviews.json`,
  `run-log/runs.jsonl`, or any other evidence directly.
- A new metric family is a **sibling** under the model, appended to the snapshot in canonical key order. It
  never widens a shared object and never forces a renderer to change.
- The snapshot is a pure function of its evidence: identical evidence → identical snapshot (save for
  `generated_at`).

**Non-goal:** this ADR does not prescribe *how* a consumer renders or visualises the snapshot — a web UI, a
CLI, a REST API, an editor extension are all free to present it however they like. It defines only the *data
contract* between the Analytics model and its consumers: read the snapshot, not the evidence.

## Consequences

- **Proven, not asserted.** Three consumers derive from one snapshot today: `analytics.json` (serialize), the
  dashboard (summary), `analytics.html` (explorer). `buildAnalytics()` renders JSON and HTML from a *single*
  snapshot object; `renderAnalyticsHtml(snapshot)` has no evidence dependency; and `artifact.test` asserts the
  on-disk file equals `buildSnapshot()` — it tests the contract, not the renderer.
- **A fourth renderer plugs in with zero new data or logic** — it consumes the snapshot. If it needs data the
  snapshot lacks, that pressure drives a new metric family in the model, never a back-channel read of evidence.
- **The boundary is directional.** The run log feeds TrendMetrics feeds the snapshot; a consumer reads the
  snapshot. No consumer reads back to evidence. (This mirrors the events → transitions → direction layering the
  Run Log and TrendMetrics contracts already lock.)
- **Cost, accepted on purpose.** The snapshot must carry everything any consumer needs. That is the intended
  trade: centralised logic and data in exchange for renderers that cannot drift.

## References

- `docs/evidence-analytics.md` — the subsystem contract (read-only projection, DTO shape).
- `docs/run-log.contract.md`, `docs/trend-metrics.contract.md` — the source and the metric family added on top.
