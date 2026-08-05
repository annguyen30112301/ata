# 5. A validation pattern graduates to a repo law only after three independent subsystem instances confirm it

Status: **Accepted** — 2026-08-05

## Context

The repo already has one graduation ladder made explicit. A *boundary* is not a law when first seen; it earns the
Capability Registry only by recurring — `ADR-0001` observed the Analytics directional law, `ADR-0002` found the
same shape in Decision, and `ADR-0003` generalized both into the registry's `Owns · Consumes · Law` columns. Law
followed *recurrence*, not first sighting.

The property-test pattern (`docs/validation-pattern.md`, D.2) was written the same way and said so out loud: it is
"descriptive, not invented top-down", and it deferred its own promotion — *"when the pattern has three instances
and has stopped changing, it graduates from this note to an ADR."* At D.2 that condition was unmet: only Decision
(D.1) used it.

Phase D and E then produced exactly the missing evidence. Three **independent** subsystems now instantiate the
pattern — Decision (D.1, the exemplar), Analytics (D.4b), Presentation (E.1) — and the closure report (E.2,
`docs/validation-audit.md`) confirms two things the graduation clause required: no Registry subsystem remains in
discovery, and the pattern stopped changing (the third instance closed by *application*, inventing no new kind of
law). The open question is therefore **not** "what is the pattern" — that already lives, fully, in
`validation-pattern.md`. It is: **when has a validation pattern earned the right to become a law of the repo?**

## Decision

**A validation pattern graduates to a repo law only after three independent subsystem instances confirm it, with
the pattern unchanged across the third. This ADR graduates the property-test pattern under that rule — and, in
graduating it, states the rule itself as the thing being locked.**

The distinction is deliberate and is the point of this record:

- The **pattern** — Algebra · Composition · System; `LAW → minimal synthetic → property → counter-example` — is a
  *consequence*. It stays described in `docs/validation-pattern.md`; this ADR does not restate it.
- The **decision** — *three independent instances, pattern stable, before a validation shape becomes law* — is
  the *rule*. That is what graduates here, because it is what Phase D and E actually spent their effort proving.

This mirrors the capability ladder one level up, so the repo now has one graduation law in two registers:

```
observation  → (recurs across subsystems) → Capability Registry   (a boundary becomes law)
pattern      → (three independent instances) → ADR                 (a validation shape becomes law)
```

Both say the same thing: **a shape earns law by independent recurrence, not by first authorship.** Uniformity is
not the bar — the third instance may legitimately name a layer `N/A` (Analytics has no Composition surface).
Graduation requires each instance to *name its shape correctly*, not to look identical; naming a layer absent is
the same act as naming a defect or a boundary.

**Non-goal:** this ADR does not add a validation layer, mandate a test framework, or freeze `validation-pattern.md`
against future clarification. It fixes one thing — the evidentiary threshold at which a validation pattern stops
being a note and becomes a law.

## Consequences

- **A single subsystem is never sufficient evidence for a validation law.** Decision alone was not enough;
  Decision + Analytics was not enough; Presentation made three. This is the guard against *premature
  standardization* — codifying a shape from one lucky fit, before independent subsystems have stressed it.
- **The property-test pattern is now law.** A new subsystem *applies* it rather than re-deriving it, and a
  subsystem is "done" when every layer with a surface is proven as a property and every absent layer is named
  `N/A` — the closure criterion, now backed by an ADR rather than a note.
- **Graduation is deliberately conservative.** The rule can delay codifying a genuinely good pattern until a third
  instance appears. Accepted on purpose: in a proof-oriented repo a *late* law costs less than a *wrong* law that
  every future subsystem then inherits.
- **The two ladders are now symmetric and can be reasoned about together.** Any future "should this become law?"
  question — for a capability boundary or a validation shape — has one answer: show three independent instances
  and a stable shape, or it stays an observation.

## References

- `docs/validation-pattern.md` — the graduated pattern (the shape); its own "Forward" clause set this threshold.
- `docs/validation-audit.md` (E.2, Closure) — the evidence: three instances, discovery ended, pattern stable.
- `docs/adr/0003-presentation-capability-registry.md` — the capability ladder this rule is the validation-register twin of.
- `docs/adr/0004-phase-closes-when-validation-stops-discovering.md` — the phase boundary that framed E.1 as application, producing the third instance.
- `decision/properties.test.mjs` · `analytics/properties.test.mjs` · `overview/properties.test.mjs` — the three independent instances themselves.
