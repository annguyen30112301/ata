# 3. A renderer owns exactly one DTO; a dashboard composes renderers and owns no data

Status: **Accepted** — 2026-08-04

## Context

Three subsystems now lock what their consumers may depend on: Analytics (`ADR-0001`), Decision (`ADR-0002`), and
the evidence/run-log sources beneath them. Across their renderers a pattern appeared without being named:
`analytics.html` is a pure function of an `AnalyticsSnapshot`; `decision.html` is a pure function of a
`RecommendationSnapshot`. Each reads exactly one DTO and nothing else — no upstream model, no evidence, no
sibling artifact.

Presentation is the one layer with no contract yet, and it has a predictable failure mode the moment an
aggregate view appears. A dashboard that *reads* `AnalyticsSnapshot` **and** `RecommendationSnapshot` **and** a
future `EvolutionSnapshot` becomes the largest subsystem in the system, re-derives data every card wants, and
drifts from every source — the exact god-object ADR-0001 was written to prevent, one layer down. A second
failure mode is subtler: a dashboard that reuses a renderer's HTML makes navigation depend on documentation, so
one cannot change without the other. This record settles what a renderer and a dashboard are each allowed to
**own** and **consume** — before any aggregate-dashboard code exists, which is the cheapest moment to lock it.

## Decision

**Every AVF subsystem obeys one meta-contract — the Architectural Capability Registry. Each row states what a
subsystem OWNS (its output), what it may CONSUME (its single input edge), and the LAW it preserves. This ADR
adds the Presentation rows and locks them.**

| Subsystem | Owns | Consumes (only) | Law |
|-----------|------|-----------------|-----|
| Analytics | `AnalyticsSnapshot` | evidence (`reports/`, `reviews.json`, run log) | same evidence → same snapshot |
| Decision | `RecommendationSnapshot` | `AnalyticsSnapshot` | same snapshot → same recommendations |
| **Renderer** | **one view** | **one DTO** | **same DTO → same view** |
| **Dashboard** | **layout · navigation · cross-links** | **rendered cards (strings)** | **composition — owns no data** |

`Consumes` is the *type of the input edge*, not a behavior: it is agnostic to how the value arrives (evidence by
I/O, a DTO by an in-process call, a card by its caller). It extends ADR-0001's directional law one column wide —
read the `Consumes` column top to bottom and it is the arrow `evidence → analytics → decision → presentation`,
each layer consuming exactly the one above.

Two things this locks for Presentation:

- **A renderer owns presentation only.** It consumes one DTO and returns one view; same DTO → same view (pure).
  It reads no other DTO, no evidence, no artifact file; it does no I/O, computes no metric, mints no
  recommendation, caches no state. `renderAnalyticsHtml`, `renderDecisionHtml` already satisfy this.
- **A dashboard is a composition, not a renderer.** It owns layout, navigation, and cross-links, and it consumes
  **already-rendered cards** — never a DTO. It holds no domain model, so it does not grow with the number of
  subsystems: a new subsystem adds one card, not one dependency inside the shell.

Two corollaries, stated so they are not re-litigated:

- **Explorer and Summary are two *different* renderers of the same DTO**, not one HTML reused. Explorer =
  documentation (the full detail behind the numbers); Summary = navigation (what to look at first). Both consume
  the same DTO; neither reuses the other's markup.
- **A dashboard consumes the *composition*** `composeDashboard({ analyticsCard, decisionCard, … })`, whose inputs
  are strings, never `composeDashboard({ analyticsSnapshot, … })`. The signature is the boundary.

**Proof-oriented, not compiler-enforced.** AVF is plain `.mjs`; no compiler guards these boundaries. So the
registry carries a standing rule: **every row must admit exactly one acceptance proof.** `Owns` is proven by an
output-shape fixture; `Law` by a determinism/purity suite; and `Consumes` by an **import/dependency-boundary
test** — the shell (and each renderer) imports no model or build module, and the shell's signature takes rendered
strings. A boundary that cannot be proven this way is not yet locked.

**Non-goal:** this ADR does not design the dashboard's visual layout, mandate HTML over any other format, or say
which cards ship first. It defines the capability boundary — Owns / Consumes / Law — from which the dashboard is
a *deduction*, not a feature request.

## Consequences

- **The dashboard cannot drift, because it holds no data.** Every number on it is produced by a renderer that
  owns exactly one DTO; the shell only arranges them. Correctness lives in the renderers and their DTOs, which
  are already proven upstream.
- **Presentation scales by breadth, not depth.** A future Evolution subsystem adds one registry row, one
  renderer, and one card. The shell is unchanged; it gains a child, not a dependency.
- **`owns no data` is a test, not a comment.** The proof is structural: the shell imports no `*/model.mjs` or
  `*/build.mjs`, and a test composes it from plain strings and asserts the page still renders. This is the
  proof-oriented substitute for a type system — the same standard every other AVF guarantee meets.
- **Cost, accepted on purpose.** Two renderers per DTO (explorer + summary) rather than one reused. The trade is
  deliberate: reuse would couple navigation to documentation, and the registry forbids exactly that coupling.

## References

- `docs/adr/0001-analytics-snapshot-contract.md` — the directional law this registry generalizes into a column.
- `docs/adr/0002-decision-contract.md` — the second row; its consumers already read one DTO only.
- `analytics/render.mjs`, `decision/render.mjs` — the two renderers that already satisfy the Renderer row.
