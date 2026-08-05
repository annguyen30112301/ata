# The Property-Test Pattern — how AVF proves an invariant

Status: **Adopted** — 2026-08-04. Descriptive, not invented top-down: it codifies the shape
`decision/properties.test.mjs` (Phase D.1) already uses, so every subsystem's property tests read the same and
the project grows one language for proving architecture rather than three dialects of it.

## Why

AVF's discipline is *architecture exists only when it is provable* (ADR-0003). Two kinds of proof serve it, and
they are different:

- a **fixture test** proves a *point* — *this input yields this output*;
- a **property test** proves a *set* — *for every valid input, this relation holds*.

As subsystems grow property suites (Decision has merge/sort/policy; Analytics will have trend/snapshot;
Presentation has ownership), they must share one way of writing that second kind of proof, or each reinvents it.
This document fixes the way.

## The three layers

A property belongs to exactly one layer. Naming the layer keeps a suite legible and tells you where a failure
comes from: a **System** property that breaks usually traces to a broken **Algebra** property beneath it.

| Layer | Proves a law about… | Decision examples |
|-------|---------------------|-------------------|
| **Algebra** | one function, in isolation | merge is idempotent + associative; sort is a total order |
| **Composition** | how stages combine | policy composition is not commutative |
| **System** | the pipeline end-to-end | recommend is order-independent; `recommendationSnapshot.recommendations = recommend` |

## The shape of one property

```
LAW  →  minimal synthetic structure  →  property  →  (counter-example, when one exists)
```

- **Law** — the invariant, stated as an equation or relation: `sort(sort(x)) = sort(x)`.
- **Minimal synthetic structure** — the *smallest* input that exercises the law, built by hand, carrying **no
  business meaning**. A property is about *shape*, so a real-domain fixture only adds noise and a false sense
  that the law depends on that scenario. `R('a:review','HIGH')` beats a real recommendation.
- **Property** — assert the relation over that input (and, for order laws, over its permutations).
- **Counter-example** — when the law has a boundary, prove the boundary too: an input where the relation does
  **not** hold. Decision's `[setLow, dropLow] ≠ [dropLow, setLow]` proves composition is *not* commutative — it
  maps the edge of the invariant, which the law alone leaves implicit.

## Two rules

1. **Minimal synthetic over business fixture.** If a property needs a real snapshot, it is probably a *System*
   property; build the *smallest* snapshot that triggers it and assert the relation, never a specific value.
2. **A law earns a counter-example where one exists.** Not a quota — not every law has a meaningful boundary.
   But proving what an invariant is *not* pins its shape far better than proving only what it is; a suite that
   only ever confirms true things has not found the invariant's edges. Prefer proving one boundary over proving
   a second thing that is true.

## Placement

One file per subsystem: `<subsystem>/properties.test.mjs`, wired into `test:<subsystem>`. It imports the pure
functions it checks — exporting an internal for this purpose (e.g. `sortRecommendations`) is fine, since it is
the model's deep surface, not the public barrel. The exemplar is `decision/properties.test.mjs`.

## Forward

Analytics (`trendMetrics` permutation-invariance, `analyticsSnapshot` purity over evidence order) and
Presentation (a renderer is a pure function of one DTO; a shell composes rendered strings) each get their own
`properties.test.mjs` in this shape. When the pattern has three instances and has stopped changing, it graduates
from this note to an ADR — the same way a boundary graduates from an observation to the Capability Registry.
