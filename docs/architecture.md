# AVF — Architecture

This document explains AVF as a **pipeline of proofs**, not a tree of folders. Read it top to bottom and
the directory layout will look inevitable rather than arbitrary — every module exists to own exactly one
stage of the pipeline below.

## The one principle

> **Every evolvable transformation must stand behind an invariant artifact and emit a verifiable proof.**

Everything else is a consequence of applying that principle at each stage.

## The proof pipeline

Data flows one way. At every arrow, the thing on the left is *locked* before the transformation on the
right is allowed to run — which is why every step is reproducible and auditable.

```
  Evidence            raw payload from a real source (Azure DevOps, Jira, HTML, JSON)
     │  fetch                                    ── acquisition only; no meaning applied
     ▼
  Connector           adapter (source vocabulary) → normalize → materialize
     │                                             ── the ONE pipeline, shared by every source
     ▼
  Canonical  ──────►  Input                       meaning is now source-independent
     │  evaluate                                   ── engine sees Input, never the source
     ▼
  Engine              a swappable specimen: rule-based today, maybe an LLM tomorrow
     │
     ▼
  Verdict             SUPPORTED · REFUTED · INVALID · MISMATCH · DEFER   (two layers, below)
     │                                             ── judged against an immutable Benchmark
     ├──────────────────────────────┐
     │ evaluateRules                 │ submitReview
     ▼                               ▼
  Ruling  (machine)              Decision  (human)
     │  block / warn / allow        │  confirm / override
     ▼                               ▼
  Renderer / CI gate             Knowledge  (a confirmed fact feeds the next verdict)
  md · pr · json · sarif · teams
```

Two things join the flow from the side rather than sitting in it:

- **Benchmark** — the immutable set of cases + human-confirmed oracles the Verdict is judged against.
  It does not transform data; it is the *standard* the Engine is measured by. Engines evolve; the
  benchmark does not move to accommodate them.
- **Knowledge Package** — human-confirmed domain knowledge (a lifecycle, an equivalence table) that a
  benchmark consumes. Activated by a DEFER: when the engine says "I lack the knowledge to decide", the
  answer is to *add a package*, not to loosen the engine.

## Walking the stages

Each stage is an *evolving component behind an invariant standard* — the same shape repeated.

| Stage | In → Out | Invariant standard (locked first) | Who owns it |
|-------|----------|-----------------------------------|-------------|
| **Evidence** | source → raw payload | evidence fixture (raw, un-cleaned) | `connectors/<source>/fixtures/` |
| **Connector** | raw → canonical → input | equivalence fixture (which raws mean the same) | `connectors/` (`sdk/` · `<source>/`) |
| **Engine** | input → decision | the Engine Contract | `engines/` |
| **Verdict** | decision → two-layer verdict | the Benchmark (oracles) | `framework/kernel.mjs` + `benchmark/` |
| **Ruling** | report + policy → action | `rules/default.json` (editable policy) | `rules/engine.mjs` |
| **Decision** | verdict + reviewer → learning | the Oracle Contract (human-only, append-only) | `oracle/` |
| **Render** | report + ruling → a view | — (pure projection) | `report/` |

### Why the Verdict has two layers

The kernel emits **both**:

- a **hypothesis verdict** — owned by the benchmark, answering *"is the research direction still
  standing?"* It is not computed from any engine.
- an **implementation verdict** — computed from one engine run, answering *"does this engine realize
  it?"*

They can hold at once: **Hypothesis SUPPORTED, Implementation REFUTED.** That is how an engine can fail
without discrediting the benchmark it failed against.

### Why Ruling and Decision are separate

A **Ruling** is what the *machine* does with a verdict (gate a PR); a **Decision** is what a *human* does
with it (confirm the machine was right, or override it). Different actor, different contract — so they are
different types in different modules, and neither is called "Decision" by accident. A verdict never
changes; only the action taken on it does.

## Module → responsibility

Now the layout reads as the pipeline, one directory per stage:

```
connectors/     Evidence → Input.  sdk/ (contract·validate·proof·collect·pipeline) + integration/
                (auth·transport·retry·pagination) + html/ · json/ · azure-devops/ · jira/
knowledge/      Human-confirmed domain knowledge (lifecycles); shared by benchmarks, activated by DEFER
benchmark/      H0–H5: immutable cases + oracles — the standard engines are judged against
engines/        Swappable specimens behind the Engine Contract (observation·matcher·…·referential)
framework/      kernel.mjs (pure evaluation) + run.mjs (IO shell → reports/)
rules/          The Rule Engine: Report + policy → Ruling. Policy in default.json, never in code
report/         One Report model + adapters in + renderers out (md·pr·json·sarif·teams)
oracle/         Oracle Runtime: a human Decision over a verdict, append-only, routed to learning
dashboard/      Scans repo state → one self-contained HTML view
bin/avf.mjs     The CLI: a thin dispatcher over the public API — no logic of its own
index.mjs       The stable public API barrel (see below)
```

## The public API (two tiers)

[`index.mjs`](../index.mjs) is the **stable** surface — a small, deliberately stingy set (`run`,
`makeReport`, the renderers, `evaluateRules`/`exitCodeFor`/`ACTION`, `submitReview`/`DECISION`,
`buildDashboard`, the adapters). It is a contract: nothing here is removed without a major bump.

Everything else is **internal**: reachable by deep path, but free to change between minor versions.
Adding to the stable tier later is cheap; removing from it is not — so the boundary starts small and
grows only when a consumer genuinely needs a symbol promoted.

The CLI, the examples, a future REST layer, and the tests all consume this one surface. There is exactly
one way to run AVF, whichever entry you come in through.

## The recursive law

Every layer above is the same shape — *an evolving component behind an invariant standard that was
written first*:

| Layer | Invariant standard | Evolving component |
|-------|--------------------|--------------------|
| Engine | Benchmark | Engine |
| Kernel | Golden Kernel Tests | Kernel implementation |
| Connector | Evidence Fixtures | Connector |
| Normalize | Equivalence Fixtures | Normalize implementation |

> **A new layer earns its place by first writing the invariant it will be judged against.**

For the research behind this shape — the hypotheses, the Reduction/Reality tests, the knowledge
dimensions — see the [README](../README.md). This document is only the *architecture*; that one is the
*epistemology*.
