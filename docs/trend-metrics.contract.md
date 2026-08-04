# TrendMetrics — research contract (v1.2)

Status: **design, not yet implemented.** This is a *research contract*, not a model spec: before any code, it
locks the ONE question TrendMetrics exists to answer and the metrics that follow from it. Like Evidence
Analytics, the discipline is question-first — but Trend needs it *more*, because a run log invites the failure
mode "there's a log → draw a chart → name the metric later", which inverts the design. The metric must fall
out of the question, never the reverse.

## The governing decision

> **TrendMetrics answers ONE question: _in which direction is implementation behavior moving?_ — read over the
> ordered history of runs in the current run log. It measures direction, stability, and confidence-quality;
> nothing else.**

And a scope honesty this contract binds from the start (carried from the run-log contract §4):

> **TrendMetrics v1.2 describes the execution history visible in the CURRENT run log — not the project's
> evolution.** The log mixes real runs with test-harness runs (`run()` is a primitive, §run-log/4), so the
> honest name is a **Local Machine Trend**: the trajectory *this machine* produced. Promoting it to a
> project-canonical evolution trend waits on a future "official evolution run" distinction — out of scope here.

### TrendMetrics reads TRANSITIONS out of history — it does not repeat history

The one line that keeps `AnalyticsSnapshot.trend` from degenerating into a shrunk copy of `runs.jsonl`:

```
run log            →   TrendMetrics        →   AnalyticsSnapshot.trend
stores  EVENTS         derives  TRANSITIONS     presents  DIRECTION
```

A series `SUPPORTED, SUPPORTED, SUPPORTED` must read as `unchanged`; `INVALID, …, SUPPORTED` as
`toward_supported`; the reverse as `away_from_supported`. The raw per-run sequence is **already** in the log —
echoing it back verbatim is not a metric, it is a copy wearing a metric's name. A reader's job is to
*interpret*. So `trend` carries interpreted direction (tokens, endpoints, a flip count), never the verbatim
list of verdicts. If `trend` ever reads back as the log restated, the metric has failed (acceptance §6).

## 1. What Trend answers — and does not

| Trend **answers** | Trend does **NOT** answer | Owner of the "not" |
|-------------------|---------------------------|--------------------|
| ✓ **Direction** — is the implementation verdict trending toward SUPPORTED or away? | ✗ **Correctness** — is any single verdict right? | the benchmark / kernel |
| ✓ **Stability** — does a series flip back and forth, or hold? | ✗ **Benchmark quality** — is the benchmark good? | a research question, not a metric |
| ✓ **Confidence quality** — is confident-but-wrong behavior shrinking over time? | ✗ **Human review** — confirm/override over time | ReviewMetrics (`reviews.json`) |

Deliberately **excluded as non-metrics** (they are inventory or noise, already covered or meaningless):
- *"how many runs"* — a counter, not a direction; no architectural signal.
- *"how many engines / hypotheses"* — Overview already answers this from latest state.
- *"a timeline"* — a rendering of events is not a metric; the metric is the *direction* read off the events.

## 2. The metrics — three axes of one question

Three metrics, one per **axis** of "which direction is behavior moving". They are **structurally equal** — the
order below is the three axes, not a priority ranking. Each is a pure function of the run log — no reads of
`reports/`, `reviews.json`, or any policy (those would make it a projection, not a trend of source facts) — and
each yields a *direction*, never a raw sequence (governing decision).

### Direction — verdict trajectory
Over a series (§3), read the direction of `implementation_verdict` across its runs — `toward_supported`,
`away_from_supported`, or `unchanged` — with its endpoints (first, latest). This is evolution, not inventory:
`INVALID → REFUTED → SUPPORTED` is a *story*; Analytics' latest-state verdict is a single frame.

### Confidence quality — critical-confident-wrong trajectory
Over a series (§3), read the direction of `critical_confident_wrong` (falling / rising / flat) with its
endpoints. Among the three this is the **headline operational signal** — not "more important than the others",
but the number to put in front of an operator: a verdict says the engine is *right or wrong*; CCW says the
engine is **confident and wrong on a critical case**, a failure of a different severity. `SUPPORTED → INVALID`
is less alarming than a CCW line that will not fall; a CCW line that falls `3 → 2 → 1 → 0` is the clearest sign
the system is actually maturing rather than churning.

### Stability — verdict flip
The count of **adjacent verdict changes** in a series' ordered verdicts — `SUPPORTED → INVALID → SUPPORTED` is
two flips. Analytics cannot see this (it holds only the latest verdict); a trend can. **Verdict flip is DEFINED
over `(hypothesis, engine@version)` series** (§3) — not "also computed" there. A flip counted per hypothesis is
a *different* metric, not this one: re-running an older version would register a benign change as instability.
Verdict Flip means exactly *did a fixed specimen change behavior* — which, under determinism (§4), can only
mean the ground moved.

### DEFER rate over time — deferred to a second layer (NOT v1.2)
Not because DEFER is unimportant, but because a lone trend line **cannot disambiguate** its two causes: DEFER
may rise because the engine got *more honest* (good) or *weaker* (bad). As a first metric it invites
misreading. It returns once a second signal disambiguates it (e.g. paired with the refutation/guard split).
Excluding it now is a scope decision, not a dismissal.

## 3. The series key (ratified)

Every metric is "over a series", and **what defines a series decides what the metric MEANS.** The two candidate
units:

- **Per hypothesis** (ordered by run time): the trajectory of "the implementation for H5" across whichever
  engine versions were run. Captures the *evolution* story (`v0 INVALID → v0.1 REFUTED → v0.3 SUPPORTED`).
- **Per `(hypothesis, engine@version)`**: the trajectory of one fixed specimen. Because the kernel is
  deterministic (§4), this series is normally flat — so any movement is a **ground-moved alarm** (the
  benchmark changed under a fixed engine), not engine progress.

**Decision — each metric takes the observation unit its own meaning requires, not one grouping forced on all
three:**

| Metric | Series key | Because it asks |
|--------|-----------|-----------------|
| **Verdict trajectory** | **per hypothesis** | "how is the implementation *for this hypothesis* evolving?" |
| **CCW trajectory** | **per hypothesis** | "how is the *quality* of that implementation evolving?" |
| **Verdict flip** | **per `(hypothesis, engine@version)`** | "did a *fixed specimen* change behavior?" |

Verdict flip is **defined** over `(hypothesis, engine@version)` — this is the metric's identity, not an "also".
A flip counted per hypothesis is a *different* metric that does not exist in this contract; asked "can flip be
per hypothesis?", the answer is "that is something else". The principle: *each metric chooses the observation
unit that matches its meaning*, which matters more than a uniform grouping. §4 explains why this is not cosmetic.

## 4. The determinism note (why §3 matters)

A fixed `engine@version` against a fixed benchmark is **deterministic** — same inputs, same verdict, every run.
So within a `(hypothesis, engine@version)` series, the verdict cannot move unless *the benchmark evolved*. This
is not a limitation to hide; it is a **feature to read**: movement in a fixed-specimen series is a precise
signal that the invariant artifact (the benchmark) changed — exactly the event AVF's whole discipline is built
to notice. It is also why "flip" is only clean at the `(hypothesis, engine)` grain; at the hypothesis grain,
apparent flips can be an artifact of *which version was run when*, not instability.

## 5. Shape & placement (follows §3, sketched — the model spec comes after ratification)

`TrendMetrics` is a new metric family under `AnalyticsModel` — a **sibling**, added without touching Overview,
Benchmark, Review, or Rule. It reads only `loadRunLog()`. Its result rides on the snapshot as
`AnalyticsSnapshot.trend`, **appended after `rule`** (the canonical-order rule of the analytics contract), so
no existing renderer changes. If the log is empty (a fresh clone), `trend` reports **"no history yet"** —
degrading exactly as Overview reports zero for an empty `reports/`. A trend needs **≥ 2 runs in a series**;
with fewer, the direction is undefined, not zero.

Its values are **interpreted direction**, per the governing decision — a direction token plus series
endpoints and a flip count, **never a verbatim per-run array**. The raw history stays in `runs.jsonl`; `trend`
is the reading of it. Shape:

```
trend = {
  hypotheses: {                       // per hypothesis (verdict + ccw trajectory)
    H4: {
      verdict: { from, to, direction: VerdictDirection },
      ccw:     { from, to, direction: CCWDirection },
      metadata: { observations }      // CONTEXT, not metric — how many runs back the direction
    }, …
  },
  stability: {                        // per (hypothesis · engine@version) — verdict flip
    "H5 · referential@v0.3": { flips, metadata: { observations } }, …
  }
}                                     // empty log → { status: "no history yet" }
```

Two rules this shape locks:
- **`direction` is a CLOSED enum** — a renderer or API consumer never guesses. There are exactly two, and no
  value outside them ever appears:
  - `VerdictDirection = toward_supported | away_from_supported | unchanged | insufficient`
  - `CCWDirection    = falling | rising | flat | insufficient`
  (`insufficient` is a series of &lt; 2 runs; direction is undefined, not zero.)
- **metric ≠ inventory.** The only metric fields are `direction`, its endpoints, and `flips`. The run count is
  *context* and lives under `metadata.observations` — never as a peer of the metric — so a dashboard can never
  turn `runs: 42` into a headline. Metric = direction; metadata = confidence/context.

## 6. Acceptance — the Trend Test (turns run-log bars 9 & 10 green)

Fixture-first (a hand-built run log of known entries), mirroring `snapshot.test.mjs`:
1. **Direction** — a fixture whose ccw goes `1 → 1 → 0` reads as *improving*; a verdict series `INVALID →
   SUPPORTED` reads as *toward SUPPORTED*.
2. **Stability** — a series `SUPPORTED → INVALID → SUPPORTED` reports exactly **2** flips.
3. **Replayable from the log alone** (run-log §6 bar 9) — the trend builds from `runs.jsonl` with `reports/`
   deleted; every field it reads is on the entry.
4. **Deterministic** (run-log §6 bar 10) — the same fixed log yields an identical trend, twice.
5. **Empty / thin** — an empty log → "no history"; a single-run series → direction undefined, never a crash.
6. **Interpretation, not echo** — a flat series `SUPPORTED, SUPPORTED, SUPPORTED` reads as `unchanged` (a
   direction token); `trend` contains no verbatim per-run verdict list. If the output can be diffed back into
   the raw log sequence, this bar is red.

The bar is the project's usual one: Trend is "done" when these are provably true from fixtures — not when a
chart looks finished.

## 7. Evolution

| Stage | Capability | Gate |
|-------|-----------|------|
| **v1.2** | Local Machine Trend: verdict trajectory · ccw trajectory · flip, over the current run log | this contract |
| **v1.2+** | DEFER-rate trend, once paired with a disambiguating signal | a second signal defined first |
| **future** | project-canonical evolution trend (committable history) | an "official evolution run" vs test-invocation distinction (run-log §4) |

Each stage is additive — a metric or a source, never a rewrite of the model or a renderer. Locking §3 is the
last "meaning" decision of v1.2; after it, the rest returns to the project's rhythm: contract → test →
implementation → consumer.
