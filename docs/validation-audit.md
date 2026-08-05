# Validation Audit — coverage of the property-test pattern across AVF

Status: **Point-in-time** — 2026-08-04 (Phase D.3). A map, not a contract: it measures which of the three
property layers (`docs/validation-pattern.md` — algebra · composition · system) each subsystem already proves,
and in what form, so D.4 fills a *real* gap rather than writing property tests where invariants are already
covered. Retire this file once Analytics and Presentation have their own `properties.test.mjs`.

Legend: **P** = proven as a property (law over synthetic input / permutations) · **F** = proven, but as a
single-case fixture assertion · **S** = proven structurally (import/ownership boundary) · **N/A** = the layer
has no surface here · **gap** = the invariant is not proven at all.

## Coverage

| Subsystem | Algebra | Composition | System | `properties.test.mjs` |
|-----------|---------|-------------|--------|-----------------------|
| **Decision** | **P** — merge idempotent/associative, sort total-order | **P** — policy non-commutative (counter-example) | **P** — recommend order-independent, `snapshot.recommendations = recommend` | ✓ (the exemplar) |
| **Analytics** | **F** — `deterministic` (same order) + `pure`; **gap (verified)**: NOT permutation-invariant | **F** — family assembly + canonical key order tested once (artifact) | **F** — determinism + `file IS snapshot` (projection); **gap**: order-invariance | ✗ |
| **Run-log** | **P** — append-immutable prefix, write-is-read-free byte-identical across 1000 lines | N/A | **P** — replayable-from-log-alone (realised in trend.test) | ✗ (embedded in run-log.test) |
| **Presentation** (overview · dashboard) | **F** — renderer deterministic + pure, single-case | **S** — shell imports nothing, composes opaque strings, cards own one model | **F** — composeDashboard deterministic | ✗ |
| Kernel · Report · Rules · Oracle · Connectors | **F** (some embedded invariants: "rules never change the verdict", "normalize collapses formats") | — | — | ✗ (foundational, predate the pattern) |

## What the audit found

- **Decision is complete and is the only subsystem proven at all three layers *as properties*.** It earns its
  role as the exemplar; nothing to add here.
- **Run-log already has genuine algebra properties** — write-is-read-free byte-identical across log sizes is a
  strong law — they are simply not filed under the pattern. No coverage gap; a *classification* gap only.
- **Analytics has the real gap — and writing the property already found it.** Determinism and purity are proven,
  but only for a *fixed input order*. Verified during this audit:
  - `trendMetrics` **is** permutation-invariant (it sorts by timestamp) — true, just unproven. An easy property.
  - `analyticsSnapshot` is **NOT** permutation-invariant. The values are identical under a reorder of
    `reports`/`reviews`, but the serialized form is not: the distribution maps (`verdict_distribution`,
    `engine_distribution`, `by_hypothesis`) are built in *encounter order*, so their key order follows the input.
    Since `loadEvidence` reads `reports/` via `readdir` (whose order is not guaranteed across filesystems),
    `analytics.json` can differ byte-for-byte between machines on identical evidence. Low severity — the artifact
    is generated, not committed — but it is a genuine hole in the "deterministic projection" claim.

  Composition here is mild (independent metric families appended in canonical order), so the gap is not "add
  Composition" — it is **make the snapshot order-invariant (stabilise the distribution-map key order), then lock
  it and `trendMetrics` with permutation-invariance properties.**
- **Presentation's Composition is the best-proven layer in the system** (structural: the shell imports nothing),
  but its **Algebra is fixture-form**: renderer determinism is asserted once, and `composeDashboard`'s order
  sensitivity (card order matters → a non-commutativity counter-example) is untested. A real but *lower-risk* gap
  than Analytics.

This confirms the shape predicted going in, with one refinement: Analytics' missing layer is not Composition
(there is little to compose) — it is **property-form Algebra/System**, and the sharpest hole is order-invariance,
which the audit found to be **not merely unproven but actually false** for `analyticsSnapshot`.

## Recommendation for D.4

**Fill Analytics first.** It is the one subsystem where a property is not just missing but would *fail today*:
`analyticsSnapshot` is order-dependent in its serialized form. D.4 = a two-line fix (emit the distribution maps
in a stable key order) followed by `analytics/properties.test.mjs` locking permutation-invariance for both
`analyticsSnapshot` and `trendMetrics`, plus determinism/purity restated as laws. This is exactly the payoff of
auditing before producing: the gap is a real defect, not a formatting chore. Presentation follows (D.5): its
Composition needs nothing, and its Algebra gap (renderer determinism as a property, `composeDashboard`
non-commutativity) is real but low-risk.

Foundational subsystems (Kernel, Report, Rules, Oracle, Connectors) are out of Phase D's scope: they carry
fixture suites with embedded invariants and predate the pattern; they graduate only if a future change makes a
law there worth stating.
