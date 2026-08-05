# 6. A feature is admitted by pressure, not by roadmap — real, and unexpressible in the current layer

Status: **Accepted** — 2026-08-05 (opens Phase F)

## Context

Phases A–E built the repo along one rhythm: `Contract → Capability → Validation → Evolution`. Each capability was
*specified* (a contract/ADR), *built*, then *proven* (the property-test pattern, graduated to law in `ADR-0005`).
That rhythm was **roadmap-driven**: the next step was known in advance because the subsystem's shape was known.

Phase F is Evolution, and evolution has no such given shape. A roadmap-driven Evolution degrades into a feature
wishlist — Subject ADT, an attention-state rename, a consecutive-trigger, an escalation policy — each defensible
as "the architecture would be nicer", none forced by anything real. The repo has already resisted this three
times: Subject ADT, the attention-state rename, and the consecutive-trigger were all **deferred, independently,
for the same reason — no pressure demanded them.** Those three deferrals are the evidence this decision graduates
on: they are to this rule what the three subsystem instances were to `ADR-0005`.

Two precedents make this ADR-shaped rather than a note. `ADR-0004` earned its record by *changing how the roadmap
operates* (Discovery → Application); this rule does the same, one level up — it changes what is *allowed onto* the
roadmap at all. And `ADR-0005` fixed the graduation bar at *three independent instances*; this rule already meets
it (three independent deferrals), so locking it now is graduation, not the premature codification the rule itself
warns against.

## Decision

**From Phase F on, a feature is admitted only when BOTH hold: (1) there is real pressure from an implementation or
a consumer, and (2) that pressure cannot be expressed by the current layer. Pressure drives features; the roadmap
does not. "The architecture would be nicer" is not pressure.**

The admission test, applied to every Phase F proposal before any code:

- **What is the pressure?** Name the implementation or consumer that is currently unable to express something it
  must. If the honest answer is "it would be cleaner", the feature is **not** admitted.
- **Can the current layer express it?** If a config, a policy stage, or an existing seam already can, there is no
  feature — only a use of what exists. A feature is admitted only when the current layer *structurally* cannot.

This inverts the earlier phases' question. It is no longer *"which feature comes next?"* but *"which feature has
earned enough pressure to deserve to exist?"* — the mature form of the same discipline that closed Phase D
(`ADR-0004`: stop when validation only confirms) and graduated the pattern (`ADR-0005`: law only after
independent recurrence).

**F.1 — override-per-hypothesis — is the first feature admitted under this rule**, and it passes on structure, not
taste (verified against the code):

- **Real pressure:** `mergeByIdentity` and the policy pipeline are built and proven, yet `mergeByIdentity` is a
  strict no-op on real data — `decision/model.mjs:96` states it outright: *"the §4 rule set never emits two
  candidates with the same id … the fold is a NO-OP; it activates the moment a rule shares an identity."* A proven
  capability that never fires is a live tension, not a cosmetic one.
- **Unexpressible in the current layer:** the rule set structurally cannot produce a same-identity collision —
  `override_rate` is `{scope: project}`, the only per-hypothesis REVIEW is `verdict_away`, so their ids never meet.
  No config or policy stage changes this; only a rule that emits a per-hypothesis REVIEW does.
- **The contract already anticipates it:** `decision.test.mjs:118` references `review.by_hypothesis.H4.override_rate`
  and the merge test folds two `H4:review` candidates — a shape the contract expresses but the implementation does
  not yet emit. This is the strongest form of pressure: *the implementation cannot say what the contract needs.*

**Non-goal:** this ADR does not design F.1, nor rank F.2–F.4. It fixes the admission gate; each feature still has
to walk through it, pressure named, on its own turn.

## Consequences

- **Deferral becomes a first-class, recorded outcome.** F.2 (consecutive-trigger — awaits enough Analytics signal
  to prove "twice consecutively"), F.3 (Subject ADT — awaits `subjectRef()` becoming hard to extend), and F.4
  (escalation/cooldown policy — awaits the default policy proving insufficient) are **not rejected**; they are
  *unadmitted, pending pressure*. Naming why a feature waits is the same act as naming why one proceeds.
- **The guard is against gold-plating, and it has teeth.** "It would be cleaner / more general / more symmetric"
  is explicitly not pressure. A proposal that cannot name an implementation or consumer that is *currently stuck*
  does not open.
- **Every Phase F record starts with a pressure statement.** A feature ADR or commit that cannot answer "what is
  the pressure, and why can't the current layer express it?" is incomplete by this rule — the question is the
  first line of the work, not an afterthought.
- **The rhythm changes register, not rigor.** Earlier phases proved *what they built*; Phase F must first justify
  *that it should build at all*. Validation did not relax; the burden moved earlier, to admission.

## References

- `docs/adr/0004-phase-closes-when-validation-stops-discovering.md` — the precedent for an ADR that changes how the roadmap operates.
- `docs/adr/0005-validation-patterns-graduate-after-three-instances.md` — the three-independent-instances bar this rule meets via three deferrals.
- `decision/model.mjs` (`mergeByIdentity`, `collectRecommendations`) — the dormant seam that is F.1's pressure; `model.mjs:96` names the no-op.
- `decision/decision.test.mjs` (the merge test) — the contract shape (`review.by_hypothesis.*.override_rate`, folded `H4:review`) the implementation does not yet emit.
