# Validation Closure — the state Validation ended in across the Capability Registry

Status: **Closure** — 2026-08-05 (Phase E.2). This file began (D.3) as a *coverage map* answering "which subsystem
still has a gap?" After E.1 that question has no force left — every Capability Registry subsystem now proves all
its layers as properties. So the file changes role: it no longer maps gaps, it **records how Validation closed**.
The map is kept below as history, because the doctrine (`docs/validation-retrospective.md`) is to preserve the
counter-record, not overwrite it.

Legend: **P** = proven as a property (law over synthetic input / permutations) · **N/A** = the layer has no
surface here · (historical: **F** = fixture-form · **S** = structural · **gap** = unproven).

## Closure — the Capability Registry

The three subsystems the property-test pattern governs (`docs/adr/0003` — Analytics, Decision, Presentation),
by layer, with the discovery status each ends in:

| Subsystem | Algebra | Composition | System | Discovery status |
|-----------|---------|-------------|--------|------------------|
| **Decision** | **P** — merge idempotent/associative, sort total-order | **P** — policy non-commutative (counter-example) | **P** — recommend order-independent, `snapshot.recommendations = recommend` | **Closed** (the exemplar, D.1) |
| **Analytics** | **P** — `trendMetrics` + `analyticsSnapshot` permutation-invariant, pure (D.4a/b) | **N/A** — independent families, no composition surface | **P** — assembler = its families, invents no family absent its input | **Closed** (D.4a/b) |
| **Presentation** | **P** — renderer deterministic + non-mutating (E.1) | **P** — `composeDashboard` non-commutative (counter-example, E.1) | **P** — shell invents nothing: `#sections = #cards` (E.1) | **Closed** (E.1) |

> **No subsystem in the Capability Registry remains in discovery under the Validation Pattern.** Every layer that
> has a surface is proven as a law; Analytics' Composition is `N/A`, not a gap — there is nothing to compose. The
> pattern now has three independent instances, and each closed by *application*, not by inventing a new kind of law.

Analytics' `N/A` is a finding, not an omission: naming a layer absent is the same act as naming a defect or a
boundary — it says *this shape has no composition register*, and that is exactly why the subsystem is done rather
than under-tested.

## How each gap the D.3 audit found was closed

The D.3 map (below) predicted the work; this is what actually closed it — kept so the seam is provable:

- **Analytics — a real defect, not a formatting chore.** The audit found `analyticsSnapshot` was **not** merely
  unproven but *order-dependent in its serialized form*: distribution maps built in `readdir` encounter order, so
  `analytics.json` could differ byte-for-byte between machines on identical evidence. **Closed by D.4a** (stable
  key order) then locked by `analytics/properties.test.mjs` (D.4b) with permutation-invariance for both
  `analyticsSnapshot` and `trendMetrics`, plus the tie **boundary** (invariance holds only for distinct
  timestamps). The audit's value was finding a defect, not filling a checkbox.
- **Presentation — fixture-form Algebra, untested non-commutativity.** The audit found renderer determinism
  asserted once and `composeDashboard`'s order-sensitivity untested. **Closed by E.1** (`overview/properties.test.mjs`):
  determinism + **non-mutation** as Algebra laws, the `[X,Y] ≠ [Y,X]` counter-example as Composition, and the
  *invents-nothing* section-count law as System. Its structural owns-no-data proof stays in `overview.test.mjs` as
  the ADR-0003 acceptance — Consumes-proof, not a pattern layer.
- **Decision — nothing to close.** Already all-P at D.1; it was and remains the exemplar.

## Out of closure scope (deliberately)

Closure is scoped to the Registry, not to the whole repo — the following are **not** claimed closed:

- **Run-log** carries genuine algebra laws (write-is-read-free byte-identical across log sizes; replayable from the
  log alone) but files them under its own suite, not the pattern. A *classification* difference, not a gap; it is
  an evidence source, not a Registry capability.
- **Kernel · Report · Rules · Oracle · Connectors** predate the pattern and carry fixture suites with embedded
  invariants. They graduate only if a future change makes a law there worth stating.

## Forward — E.3

Three independent instances of the pattern now exist (Decision · Analytics · Presentation) and the pattern has
stopped changing. By the repo's own rule — a stable pattern graduates from a note to an ADR, the way a boundary
graduates from an observation to the Capability Registry — `docs/validation-pattern.md` is now due to become
**ADR-0005**. This closure report is the evidence for that graduation: the pattern held across every subsystem it
was meant to govern.

---

## Appendix — the D.3 coverage map (history)

Preserved verbatim in substance as the counter-record: what was believed at D.3, before D.4 and E.1 closed it.

| Subsystem | Algebra | Composition | System | `properties.test.mjs` |
|-----------|---------|-------------|--------|-----------------------|
| Decision | **P** | **P** | **P** | ✓ (the exemplar) |
| Analytics | **F** + **gap (verified)**: NOT permutation-invariant | **F** | **F**; **gap**: order-invariance | ✗ → now ✓ (D.4b) |
| Run-log | **P** | N/A | **P** | ✗ (embedded in run-log.test) |
| Presentation | **F** — renderer deterministic, single-case | **S** — shell imports nothing | **F** — composeDashboard deterministic | ✗ → now ✓ (E.1) |
| Kernel · Report · Rules · Oracle · Connectors | **F** (embedded invariants) | — | — | ✗ (predate the pattern) |

The D.3 recommendation ("fill Analytics first — it is the one subsystem where a property would *fail today*") was
followed: D.4a fixed the defect, D.4b locked it, E.1 closed Presentation. The prediction and its resolution both
stand recorded above.
