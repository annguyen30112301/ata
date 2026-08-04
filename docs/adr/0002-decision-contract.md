# 2. RecommendationSnapshot is the sole contract between the Decision model and its consumers

Status: **Accepted** — 2026-08-04

## Context

Through v0.1.x → v1.2, AVF built the layer that lets it observe itself: evidence → analytics → snapshot →
consumers. `ADR-0001` settled *what every consumer of the evidence is allowed to depend on* — the
`AnalyticsSnapshot`. What the system still lacks is not another view of the evidence. It is the step that turns
observation into action: given the snapshot, *what should the maintainer do next?*

That step has a predictable failure mode if it starts as code. A recommender is tempting to grow by reflex —
one more special case, one more read of `reports/` for a field the snapshot happens not to carry, one more
free-text "reason" — until it becomes a second Analytics with opinions bolted on, drifting from the source and
unfalsifiable. The question this record settles is the mirror of ADR-0001, one layer up: *what every consumer of
a recommendation is allowed to depend on, and what a recommendation is allowed to claim.*

## Decision

**`RecommendationSnapshot` — a plain DTO produced by a pure Decision model — is the ONE contract between the
Decision layer and every consumer. The Decision model reads `AnalyticsSnapshot` and nothing else.**

- The **model owns all logic**; the **recommendation owns all output**; a **consumer owns only presentation.**
- The Decision model MUST build from `AnalyticsSnapshot` alone. It MUST NOT read `reports/`,
  `oracle/reviews.json`, `run-log/runs.jsonl`, or any other evidence. It extends the directional law of
  ADR-0001 by exactly one hop: `evidence → analytics → snapshot → decision`, never read backward.
- The Decision model is a **pure function of the snapshot**: identical snapshot → identical
  `RecommendationSnapshot` (save for `generated_at`).
- Every recommendation carries an **evidence list** — snapshot field paths and the values that fired it — so no
  recommendation is unfalsifiable, and a **deterministic id** so consumers can dismiss, acknowledge, or compare it
  across runs. `priority` and `kind` are **closed enums**, never free text; `priority` is a policy choice, not an
  analytic fact.
- A recommendation may claim **only what the snapshot proves.** A signal the snapshot does not carry is not
  invented in Decision; it becomes a new metric family in the Analytics model (ADR-0001) and is consumed from
  the snapshot like everything else. When no signal fires, the output is an empty list — silence, not filler.

**Non-goal:** this ADR does not prescribe *how* a consumer renders recommendations — a Decision dashboard, a
CLI, a REST endpoint, an editor gutter are all free to present them as they like. Nor does it define
experiment-suggestion ("run engine X next"): that is the Evolution Assistant, a later stage, gated on a stable
Decision Engine and an official evolution run. This ADR defines only the *data contract* between the Decision
model and its consumers, and the honesty bound on what a recommendation may say.

## Consequences

- **Auditable, not asserted.** Because every recommendation names the snapshot field that produced it, a reader
  walks straight from advice back to the number — the same discipline by which `RuleMetrics` records its
  `context`. A recommendation that cannot cite a field does not ship.
- **Testable like a projection.** Determinism over a fixture snapshot means the Decision Test is fixture-first,
  exactly like `snapshot.test.mjs`: a hand-built snapshot with known signals yields exactly the predicted
  recommendations, twice. Decision is "done" when that is provably true, not when advice reads persuasively.
- **The boundary is directional, and one hop longer.** The run log feeds Trend feeds the snapshot; the snapshot
  feeds Decision; a consumer reads the recommendation. No layer reads back. Decision that re-reads evidence has
  broken the same boundary ADR-0001 locked.
- **Poor but honest, on purpose.** v0 recommends attention on what the snapshot *already* proves moved —
  direction, flips, would-block, override rate — and refuses claims it cannot support ("regressed twice
  consecutively" needs a Trend field that needs a denser run log). The "I want richer advice" pressure is thus
  routed to the Analytics model, never satisfied by a back-channel read. That is the intended trade: a small,
  provable recommender now, over a persuasive one that cannot be checked.

## References

- `docs/decision.contract.md` — the subsystem research contract (the one question, the rule set, the DTO shape).
- `docs/adr/0001-analytics-snapshot-contract.md` — the input boundary this record extends by one hop.
- `docs/trend-metrics.contract.md` — the source of the direction/flip signals Decision v0 reads, and the reason
  "consecutive regression" is out of scope until a metric field defines it.
