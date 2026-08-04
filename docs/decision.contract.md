# Decision — research contract (v0, post-1.2)

Status: **design, not yet implemented.** This is a *research contract*, not a model spec: before any code, it
locks the ONE question the Decision subsystem exists to answer, and the shape of what follows from it. It
follows the Analytics subsystem the way Analytics followed the Report Engine — a new projection layered on a
boundary that already holds. Like TrendMetrics, the discipline is question-first, because a recommender invites
the failure mode "we have a snapshot → emit advice → decide later what the advice may claim", which inverts the
design. The recommendation must fall out of the question, never the reverse.

## The governing decision

> **Decision answers ONE question: _what action follows from the evidence?_ — read over a single
> `AnalyticsSnapshot`. It produces a `RecommendationSnapshot`: a set of interpreted, provenance-carrying
> recommendations. It advises; it never acts, never judges correctness, and never reads evidence.**

Analytics locked *"what does the evidence say?"*. Decision locks the next question — *"what action follows from
what the evidence says?"* — and nothing else. It is the first consumer of `AnalyticsSnapshot` that emits a new
artifact rather than re-rendering the snapshot, and that is exactly why it needs a contract before code.

### Decision reads the SNAPSHOT — it never reads evidence

The one line that keeps Decision from becoming a second Analytics:

```
AnalyticsSnapshot   →   DecisionModel        →   RecommendationSnapshot
presents  NUMBERS       reads  DIRECTIONS        presents  ACTIONS
```

`ADR-0001` binds a directional law: `evidence → analytics → snapshot → consumer`, never read backward. Decision
extends that arrow by exactly one hop and inherits the whole rule. It reads `AnalyticsSnapshot` **only** — never
`reports/`, `reviews.json`, or `runs.jsonl`. If Decision ever reaches back to evidence for "one more field", the
pressure has been misrouted: the missing field belongs in a *metric family under the Analytics model* (per
ADR-0001), and Decision consumes it from the snapshot like everything else. A recommender that re-reads evidence
is a second Analytics wearing a recommender's name.

### Decision is a pure function of the snapshot

Same `AnalyticsSnapshot` → same `RecommendationSnapshot` (save for `generated_at`). No wall-clock reasoning, no
environment, no randomness, no model weights. This is the determinism invariant carried one layer up, and it is
what makes a recommendation **auditable and testable**: a fixture snapshot with known signals yields exactly the
recommendations the contract predicts, twice.

## 1. What Decision answers — and does not

| Decision **answers** | Decision does **NOT** answer | Owner of the "not" |
|----------------------|------------------------------|--------------------|
| ✓ **What deserves attention now** — which hypothesis/specimen a maintainer should look at | ✗ **Whether a verdict is correct** | the benchmark / kernel |
| ✓ **What kind of attention** — review, investigate, or hold | ✗ **What the evidence says** (distributions, directions) | Analytics (the snapshot it reads) |
| ✓ **How urgent** — a priority derived from the signal | ✗ **What experiment to run next** | Evolution Assistant (a later stage, §7) |

Deliberately **excluded as non-decisions** in v0:
- *"run referential@v0.4 next"* — suggesting experiments is the Evolution Assistant (§7), a later stage. v0
  recommends attention on **what already moved**, never actions that require running the machine.
- *"the benchmark is weak"* / *"the engine is wrong"* — a judgement of correctness; Decision never judges, it
  routes attention. Correctness is the kernel's verdict, already in the snapshot.
- *"here is a chart of recommendations over time"* — a rendering, not a decision. The decision is the action
  read off the current snapshot.

## 2. Scope honesty — Decision v0 says only what the snapshot proves

This contract binds a limit from the start, the same way the run-log and trend contracts bound theirs:

> **Decision v0 may recommend ONLY from signals `AnalyticsSnapshot` proves today.** Its vocabulary is the
> snapshot's own closed enums and counts — `trend.verdict.direction`, `trend.ccw.direction`,
> `trend.stability.flips`, `rule.would_block`, `benchmark.case_totals.critical_confident_wrong`,
> `review.override_rate` — nothing richer.

The consequence, made concrete: a recommendation like *"implementation regressed **twice consecutively**"* is
**out of scope for v0**, because the snapshot does not prove it. `trend` exposes direction over *endpoints*
(first → latest) and a *flip count* per fixed specimen — it does **not** expose a run of consecutive regressions
(see `docs/trend-metrics.contract.md` §2, §5). The honest v0 recommendation from the same situation is:

> `H4 · verdict.direction = away_from_supported` → **HIGH · REVIEW**, because `trend.verdict.direction`.

If "consecutive regression" is wanted as a first-class trigger, the sequence is fixed and it is **not** inside
Decision: (1) add a `consecutive` field to `trendMetrics` in `analytics/model.mjs` — which itself needs a denser
run log, currently gated on the deferred "official evolution run"; then (2) Decision consumes it from the
snapshot. Decision never invents a signal the snapshot lacks. This keeps v0 **poor but honest** — and routes the
"I want more" pressure to the correct layer.

**Silence is honest.** When a signal is `insufficient` (`trend` direction undefined, `< 2` observations) or the
log reports `"no history yet"`, Decision emits **no** recommendation for it — it does not recommend "gather more
runs" (that is the Evolution Assistant). No signal → no advice, never a filler recommendation.

## 3. The recommendation — closed shape, stable identity, carried evidence

A recommendation with a free-text reason is not a contract; it is a report with an opinion. So both *what to do*
and *how urgent* are **closed enums**; every recommendation carries an **evidence list** — the exact snapshot
fields that triggered it — the way `RuleMetrics` records its `context` so a number is auditable ("under
production, this policy would block N"); and every recommendation has a **deterministic identity** so a consumer
can dismiss, acknowledge, or compare it across runs.

```
RecommendationSnapshot = {
  generated_at,
  source: { snapshot_generated_at },        // provenance: which snapshot this reads
  recommendations: [                          // ordered by priority (HIGH first), then id — deterministic
    {
      id:       string,                       // STABLE identity of (subject, semantic-kind); textual form illustrative (e.g. "H4:review"), never random
      priority: Priority,                     // CLOSED enum — a POLICY choice, not an analytic fact (§4)
      kind:     Kind,                         // CLOSED enum
      subject:  { hypothesis, engine? } | { scope: 'project' },   // the locus this is about
      evidence: [ { signal, value } ]         // provenance — snapshot field(s) + value(s) that fired. v0: exactly one element.
    }, …
  ]
}                                             // no triggering signal → { recommendations: [] } (not an error)
```

Two closed enums, exactly like `VerdictDirection`:

- `Priority = HIGH | MEDIUM | LOW`
- `Kind     = REVIEW | INVESTIGATE | HOLD`
  - **REVIEW** — a human should look; behaviour drifted or humans keep overriding the machine.
  - **INVESTIGATE** — something changed that should not have; a fixed specimen moved, or confident-wrong is rising.
  - **HOLD** — a gate would block; do not ship as-is.

  *Bookmark (not a v0 change):* these names read as *actions*, while Decision only *advises*. A later version may
  rename them to declarative **attention states** (`ATTENTION_REQUIRED` / `DRIFT_DETECTED` / `BLOCKED`) and leave
  the action mapping to the consumer — which also fits `kind` being half of the merge key (§7). v0 keeps the
  action-shaped names; and by the identity rule below, such a rename does **not** move any `id`.

Three properties this shape locks:

- **`evidence` is a LIST from day one.** Each element is `{ signal, value }` where `signal` is a **dotted path
  into the snapshot** (e.g. `trend.hypotheses.H4.verdict.direction`, `rule.would_block`) and `value` is what is
  found there. In v0 the list always has exactly one element — but it is a list, so when several triggers later
  support the same recommendation they append, and no DTO field changes (§7). Given any recommendation, a reader
  walks each `signal` straight back to the number that produced it; nothing is unfalsifiable.
- **`id` is the recommendation's stable identity — the pair `(subject, kind)`.** What the contract binds is that
  *pair*; the textual form `${subject-ref}:${kind}` (e.g. `H4:review`, `H5·referential@v0.3:investigate`,
  `project:hold`) is an **illustrative encoding**, not the identity itself — the identity notes below say why the
  string must never be mistaken for the binding. `subject-ref` is `H4` (hypothesis), `H5·referential@v0.3` (fixed
  specimen), or `project` (a snapshot-global signal). The identity is *what locus needs what kind of attention* —
  deterministic, unique within a snapshot, and **stable across runs**, which is exactly what lets a dashboard
  dismiss/acknowledge/compare. It is not positional and never random.
- **`id` is also the merge key.** Because identity is `(subject, kind)` and support lives in `evidence[]`, two
  triggers that ever share a `(subject, kind)` are one recommendation whose evidence grows — never two rows. v0
  never merges (each rule fires its own row, evidence length one), but the shape is already merge-ready.

Two identity-stability notes — **not v0 fields**, they bind how a future change must behave so no `id` ever moves
under a refactor that isn't semantic:

- **Identity is by concept, not by spelling — the encoding is not the identity.** The `id` is a *serialization* of
  the pair `(subject-ref, semantic-kind)`; read `${subject-ref}:${kind}` as `serialize(subject-ref, semantic-kind)`,
  not as a literal recipe to hardcode. The kind-token is `kind`'s **semantic key** — a stable handle for "the same
  concern" — never its display vocabulary. Today the `Kind` enum values *are* that key, so the serialization reads
  `H4:review`; but a consumer rendering `REVIEW` as "Review" or "Escalate review", or the attention-state rename
  above, is a **presentation** change and must leave the semantic key — and therefore the `id` — untouched. The rule
  an implementer must preserve: *a label edit never rewrites an `id`.* Concretely, do **not** write
  `` `${subject}:${enumValue}` `` so that renaming the enum silently re-keys every recommendation; key on the
  concept, encode for humans. If encoding and identity are conflated, the merge key has silently broken.
- **`subject` is an early ADT.** Its variants today — `{ hypothesis, engine? }` and `{ scope: 'project' }` — are a
  union discriminated by which locus a signal names. The `id` already projects it to a single `subject-ref` (`H4`,
  `H5·referential@v0.3`, `project`), so when `subject` is later normalized to `{ type, ref }` (§7), the identity
  `(subject.ref, kind)` is *unchanged* — it names the ref, never the field layout. That refactor is a shape change
  that leaves every existing `id` stable; the contract is simply naming the direction it already points.

**Invariant — identity survives representation changes.** Everything in §3 serves one rule, and it is worth naming
because the whole subsystem now rests on it: a recommendation's identity is its *meaning* — which locus, which
concern — and that meaning holds still while every representation around it is free to move. Under this contract an
`id` does **not** change when:

- a `kind` **label** is renamed (spelling — note 1),
- `subject`'s **layout** is normalized to an ADT (field shape — note 2),
- `evidence[]` **grows** as more triggers support the same concern (support — §7),
- the `priority` **policy** is retuned (policy — §4).

This is the Decision analogue of Analytics' determinism invariant. There: identical evidence → identical snapshot.
Here: identical *meaning* → identical identity, whatever the encoding. It is what makes §7's promise literal — a
representation change is never an identity change, so no `RecommendationSnapshotV2` is ever forced.

## 4. The v0 rule set — snapshot signal → recommendation

Each rule is a pure map from one snapshot signal to one recommendation. This is the whole of Decision v0; it is
deliberately small, and every row cites a field that exists in the snapshot **today**.

| Trigger (snapshot field) | Condition | → | priority · kind | Reading |
|--------------------------|-----------|---|-----------------|---------|
| `trend.hypotheses[H].verdict.direction` | `= away_from_supported` | → | **HIGH · REVIEW** | the implementation for H is moving the wrong way |
| `trend.hypotheses[H].ccw.direction` | `= rising` | → | **HIGH · INVESTIGATE** | confident-and-wrong on a critical case is growing (the headline operational signal, trend §2) |
| `trend.stability["H · eng"].flips` | `>= 1` | → | **MEDIUM · INVESTIGATE** | a *fixed* specimen changed behaviour → the ground moved (trend §4) |
| `rule.would_block` | `> 0` | → | **HIGH · HOLD** | the production gate would block current reports |
| `review.override_rate` | `>= 0.5` | → | **MEDIUM · REVIEW** | humans overrule the machine at least as often as they confirm |

Thresholds are part of the contract, not magic constants sprinkled in code — they live in one place and the test
pins them. `insufficient` / `unchanged` / `flat` / zero never produce a recommendation (§2, silence is honest).

**Subject, id, evidence per row.** The `subject` is the locus the trigger names: a hypothesis (`verdict`, `ccw`),
a fixed specimen `hypothesis·engine` (`stability.flips`), or the whole project (`would_block` and `override_rate`
are snapshot-global → `{ scope: 'project' }`). The `id` is `${subject-ref}:${kind}` — e.g. `H4:review`,
`H5·referential@v0.3:investigate`, `project:hold`. In v0 each row fires an **independent** recommendation with
`evidence` of length one (the row's trigger); the two INVESTIGATE rows never collide because their subjects differ
(a hypothesis vs. a `hypothesis·engine` specimen).

**Priority is policy, not fact.** The priority column encodes an *organizational* choice — "away-from-supported
deserves HIGH" — not something the snapshot proves; the same signal could be HIGH here and MEDIUM at an org that
tolerates more drift. v0 keeps the mapping inline for simplicity, but it is bookmarked to move behind a **policy
layer** (§7): `signal → policy → priority`, so an organization retunes HIGH↔MEDIUM without touching signal
detection. `kind` and `evidence` stay analytic (what the snapshot proves); only `priority` is policy.

## 5. Shape & placement

`RecommendationSnapshot` is a **new DTO**, a sibling artifact to `AnalyticsSnapshot`, produced by a pure
`DecisionModel` that takes a snapshot and returns recommendations. It does **not** widen `AnalyticsSnapshot` and
does **not** live inside the analytics model — it is a *downstream* projection, its own file, its own test,
mirroring how the analytics slice was introduced:

```
decision/
  model.mjs            DecisionModel: (AnalyticsSnapshot) → RecommendationSnapshot   (pure)
  decision.test.mjs    the Decision Test, fixture-first
```

The snapshot is the input boundary; the recommendation is the output boundary. A future Decision Dashboard is a
consumer of `RecommendationSnapshot` exactly as the Analytics dashboard consumes `AnalyticsSnapshot` — read the
recommendation, never the snapshot behind it, never the evidence behind that.

## 6. Acceptance — the Decision Test

Fixture-first (a hand-built `AnalyticsSnapshot` with known signals), mirroring `snapshot.test.mjs`:

1. **Each rule fires** — a snapshot with `H4.verdict.direction = away_from_supported` yields exactly one
   `HIGH · REVIEW` on `H4`; a `rule.would_block = 3` yields one `HIGH · HOLD`; and so on for every §4 row.
2. **Provenance resolves** — for every recommendation, each `evidence[]` element's `signal` is a real dotted path
   into the input snapshot and its `value` equals what is at that path. A dangling path fails the bar. In v0 every
   `evidence[]` has exactly one element.
3. **Stable identity** — `id` is a pure function of `(subject, semantic-kind)`: deterministic (same snapshot → same
   ids), unique within a snapshot, never positional, never random. The textual form (e.g. `H4:review`) is an
   encoding the fixture may pin; what the bar binds is the pair, not the string.
4. **Silence** — a snapshot whose signals are all `insufficient` / `unchanged` / zero yields
   `{ recommendations: [] }`, never a filler recommendation.
5. **Scope honesty** — no recommendation claims anything the snapshot does not contain (no "consecutive", no
   experiment suggestion, no correctness verdict). Reviewed against §2; if a recommendation cannot be traced to
   a §4 row, the bar is red.
6. **Deterministic** — the same fixture snapshot yields an identical `RecommendationSnapshot`, twice
   (`generated_at` excepted).
7. **Reads the snapshot alone** — the model builds with `reports/`, `reviews.json`, and `runs.jsonl` deleted;
   its only input is the snapshot object.

Decision is "done" when these are provably true from fixtures — not when a recommendation reads persuasively.

## 7. Evolution

| Stage | Capability | Gate |
|-------|-----------|------|
| **v0** | Decision Engine: the §4 rule set over one snapshot → `RecommendationSnapshot` | this contract |
| **v0+** | **multi-signal evidence** — several triggers merge under one `(subject, kind)` id, `evidence[]` grows past one | none — the shape is merge-ready from v0 (`evidence` is a list, `id` is the merge key); only the model learns to append |
| **v0+** | **priority as a policy layer** — `signal → policy → priority`, retunable per organization | a policy input defined once; the §4 mapping becomes the *default* policy, `kind`/`evidence` untouched |
| **v0+** | **attention-state `kind`** — rename `REVIEW/INVESTIGATE/HOLD` to declarative states, consumer maps to actions | a rename + a consumer mapping; DTO shape unchanged, and (§3 identity rule) no `id` moves |
| **v0+** | **`subject` as an ADT** — normalize the `{hypothesis,engine?}` / `{scope}` union into `{ type, ref }` | a shape refactor; `id = ${subject.ref}:${kind}` names the ref, so every existing `id` stays stable (§3) |
| **v0+** | richer triggers (e.g. `consecutive` regression) | a new metric field in the Analytics model **first** (§2), which itself needs a denser run log |
| **future** | **Evolution Assistant** — recommend *experiments to run* ("run referential@v0.4, highest expected information gain") | a stable Decision Engine + an official evolution run (run-log §4) |

Each stage is additive — a rule, a trigger, a policy input, or a downstream consumer, never a rewrite of the DTO.
The first three rows are already *shaped for* by v0 (`evidence[]`, the `id` merge key, an isolated `priority`
column), so reaching them changes the model, not the contract. The line between v0 and the future stays firm:
**v0 routes attention on what already moved; it never tells the machine what to run.** That last capability is
where Analytics finally closes into a feedback loop — and it is deliberately *not* here.
