# 4. A phase closes when validation stops discovering and only confirms — Presentation opens Phase E, not D.5

Status: **Accepted** — 2026-08-05

## Context

Phase D set out to prove the three locked capabilities — Analytics (`ADR-0001`), Decision (`ADR-0002`), and the
Presentation registry (`ADR-0003`) — by property, audit, and retrospective rather than by fixture alone. It ran
from the decision properties (`0f3b77f`, D.1) through the validation pattern (`d0c2e7e`, D.2), the audit
(`797cca9`, D.3), the analytics laws (`8f54e98`/`31f18ab`/`d276f26`, D.4a–b), and closed with the validation
retrospective (`47775de`, D.4c).

That retrospective drew its own stopping rule: *"when validation stops discovering and only confirms, the
subsystem is done — and that emptiness is itself a signal."* It named the same fact about Presentation directly:
its suite is **application, not discovery**, because the shape is already known (`composeDashboard` invents
nothing — the assembler register that `analyticsSnapshot` and `recommend` already established). The retrospective
labelled that suite **D.5** and left it as the next step.

The open question was whether D.5 belongs to Phase D. If it does, Phase D ends on a coverage-completion step —
validation confirming a shape it has already proven elsewhere. That contradicts the phase's own reason for
existing: Phase D was opened so that *architecture exists only when it is provable*, and by D.4c Validation has a
way to write (pattern), a way to measure (audit), and a way to interpret (retrospective) — a closed loop. Nothing
in Presentation's suite would add to that loop; it would only spend it.

## Decision

**The stopping rule the retrospective wrote for a subsystem also governs a phase. Phase D (Validation) closes at
`47775de` / D.4c. Presentation's validation is not D.5; it opens Phase E as E.1 — the application of the
assembler-law to a new subsystem, not a new discovery within Validation.**

The distinction the retrospective drew for a broken law now applies to a whole deliverable — a candidate step is
one of two things, and naming which *is* the decision:

- **Discovery** — the step teaches Validation something it did not already know (a defect, a boundary, a
  definition). It belongs to the current phase. This is D.1 through D.4c.
- **Application** — the step re-applies a law the phase has already proven to a subsystem whose shape is known.
  It belongs to the *next* phase, under that subsystem's name. This is Presentation.

Presentation's suite is Application: `composeDashboard` obeys the assembler register (*it invents nothing*) that
Analytics and Decision already proved. Therefore it opens **Phase E — Presentation**, and the suite formerly
called D.5 is **E.1 — Presentation Laws**. The rename is not cosmetic: the label states which phase's language a
deliverable is written in, and E.1 is written in Phase D's language, not adding to it.

**`47775de` is not amended.** Its two references to "D.5" stand as the accurate record of what was believed at
the moment the phase closed — the retrospective's own *"counter-record"* standard applied to itself. The dangling
label is not an error to erase; it is the evidence that this phase boundary was drawn deliberately, after the
fact, rather than planned into the numbering. E.1 carries a *"formerly D.5"* note forward; nothing reaches back.

**Non-goal:** this ADR does not design Presentation's laws, mandate what E.1 must assert, or reorder the
Foundation/Integration/Evolution lines in the README (a separate framing on a different axis). It fixes one
boundary — where Validation stops and Presentation begins — so the next phase opens clean.

## Consequences

- **Phase D is complete and closed.** D.1 (decision properties) · D.2 (validation pattern) · D.3 (validation
  audit) · D.4a (canonical serialization) · D.4b (trend + snapshot laws) · D.4c (retrospective). No D.5 exists,
  and none will be written — the number was retired, not skipped.
- **The stopping rule now has two registers.** It closes a subsystem (the retrospective's use) and it closes a
  phase (this use). A phase that keeps producing Application steps to "reach a round number" of deliverables is
  spending proof, not building it — this ADR is the standing objection to that.
- **Phase E inherits, it does not re-derive.** Presentation is the first subsystem developed *under* the pattern,
  audit, and interpretive vocabulary Phase D produced. E.1 proves the Presentation registry rows of `ADR-0003`
  (renderer: same DTO → same view; dashboard: owns no data) using Phase D's mechanism — application by
  construction.
- **`formerly D.5` is a provenance link, not a correction.** Anyone reading `47775de` later finds "D.5" and finds
  this ADR explaining why the label moved. The seam is preserved on purpose; erasing it would erase the decision.

## References

- `docs/validation-retrospective.md` (`47775de`, D.4c) — the closing artifact; source of the stopping rule this
  ADR generalizes from subsystem to phase, and the last commit of Phase D.
- `docs/adr/0003-presentation-capability-registry.md` — the Presentation rows E.1 will prove; the reason
  Presentation's suite is Application (the shape is already locked).
- `docs/validation-audit.md` (D.3) — the finding that Presentation is pattern-application, not discovery.
