# Validation Retrospective — what Phase D changed, and what it taught

Status: **Retrospective** — 2026-08-04. Not a contract and not a test catalogue: a record of how *validation*
changed the architecture, so a later reader does not fall back to "tests are regression insurance bolted on
after code." Phase D proved the opposite.

## The thesis

A **fixture confirms** — it proves a point you chose. An **audit or a property discovers** — it states a claim
over *all* inputs, and stating that claim forces the cases a fixture never sampled. Phase D's value was not
coverage. It was three architectural changes that only surfaced because we tried to state a law.

## Three attempts to state a law → three changes to the system

| Trying to state | What surfaced | The change it caused |
|-----------------|---------------|----------------------|
| the sort laws (D.1) | `sortRecommendations` was internal-only, unreachable by a property | exported it — the model's deep surface gained an honest member |
| the Analytics coverage map (D.3 audit) | `analyticsSnapshot` serialization was *not* canonical (its key order followed `readdir` order) | **D.4a: a canonical-serialization capability** — a code fix, not a test |
| trend permutation-invariance (D.4b.1) | the invariant has a **timestamp-tie boundary** | documented it as a *feature*, not patched |

None of these was "write a test for code that already exists." Each was a claim that, once stated generally,
changed the code or the understanding of it.

## The heuristic Phase D leaves behind

When a law is not simply green, a broken invariant (here, an order-dependence) is exactly **one of three
things**, and naming which *is* the work:

- **Defect** — the dependence is on something *meaningless* (`readdir` order). Fix the code. → `analyticsSnapshot`, D.4a.
- **Feature** — the dependence is on something *meaningful* (append order is the real tiebreaker for two runs in
  the same instant). Document the boundary. → the trend timestamp tie, D.4b.1.
- **Definition** — the "dependence" is the law's own *edge* (a derived family exists only when its input does).
  Assert the boundary. → the assembler's family-absence, D.4b.2.

Validation is the tool that tells these apart. A suite that only ever goes green never has to.

## The shape validation mirrored (it did not impose)

Every subsystem is a set of primitives assembled into one surface, so each has the same two validation
registers: the primitives' own laws (algebra), and the assembler's law (*it invents nothing*).

| Subsystem | Primitives | Assembler |
|-----------|-----------|-----------|
| Decision | merge · sort · policy | `recommend()` |
| Analytics | overview · benchmark · review · trend · rule | `analyticsSnapshot()` |
| Presentation | renderAnalyticsCard · renderDecisionCard | `composeDashboard()` |

This is why Presentation's suite (D.5) is *application*, not discovery: the shape is already known. When
validation stops discovering and only confirms, the subsystem is done — and that emptiness is itself a signal.

## What to keep

The audit found a bug; a property found a boundary; a law forced an export. **Validation is a mechanism for
discovering architecture, not a net for catching regressions after the fact.** Six months from now, when the
reflex is to treat a property suite as coverage, this is the counter-record.
