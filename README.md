# AVF — Automation Validation Framework (MVP v0.1)

> **New here? Start with [docs/quickstart.md](docs/quickstart.md)** — clone to a running example in
> a few minutes via the `avf` CLI. For how the pieces fit, [docs/architecture.md](docs/architecture.md)
> explains AVF as a pipeline of proofs. This README is the concepts + research reference behind both.

Not an "automation framework" that runs test scripts and reports PASS/FAIL. Its job
is to **evaluate and evolve automation engines** against a **constant benchmark**.
Today an engine is rule-based; in six months it may be an LLM; the benchmark does
not change. That invariance is the value the research (Project Horizon) proved.

## What this is
Project Horizon set out to build a better automation framework. What it actually produced is a
**research methodology for building AI systems that can be trusted** — because every step of their
evolution can be *refuted* by an invariant artifact and by real data. **AVF is the first
implementation that proves the method runs on real data; it is not the centre.** The centre is the
principle below. That is why the program outlives any particular engine, connector, or hypothesis.

The method has three layers of contribution — engineering (the platform), methodology (the loop and
its laws), and epistemology (statements about *knowledge*, not software):
> - a benchmark outlives every engine;
> - credibility comes from a trail of honest failures on an unchanging benchmark;
> - different hypotheses require different *kinds* of knowledge;
> - **DEFER is knowledge-aware, not failure** — "I don't have the evidence to decide" is a valid answer;
> - a Reality Test is allowed to discover *process gaps*, not just engine bugs.

## The Proof Principle
> **Every evolvable transformation must stand behind an invariant artifact and emit a
> verifiable proof.**

This is the top-level architectural principle — not merely "an idea", and not specific to AVF:
if Project Horizon ever produces a different framework, this principle still holds. It is why AVF
has the shape it does — not a pile of separate design choices. `locked artifact → transformation
→ proof`, repeated at every scale. Every layer answers the *same shape* of question:

| Layer | Central question |
|-------|------------------|
| Horizon Research | "How do you refute or support a hypothesis?" |
| AVF Kernel | "How do you evaluate an engine while the benchmark stays fixed?" |
| Connector SDK | "How do you acquire evidence while meaning stays fixed?" |
| Proof Pipeline | "How do you know every transformation was itself proven?" |

```
                 The Proof Principle
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
 Runtime Contracts             Governance Contracts
 (how it runs)                 (how it is trusted)
 · Connector                   · Proof
 · Benchmark                   · Oracle
 · Engine
```
Runtime contracts define *how the system runs*; governance contracts define *how it is trusted*.
That is why the Proof Contract does not sit beside the Engine Contract — they solve different
kinds of problem. Audit (law 3) is governance, not a runtime feature.

```
Specification → Benchmark → Automation Engine → Report      (AVF)
     (vs. traditional:  Test Case → Playwright/Appium → PASS/FAIL)
```

## Doctrine
```
        ┌───────────────────────────────┐
        │ BENCHMARK (H0·H1·H2·H3·H4·H5…)│   immutable · human-confirmed oracles
        └───────────────┬───────────────┘
                        │ same cases, unchanged
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
     engine v0   →   engine v0.1  →   engine v0.2   →  (LLM tomorrow…)
     REFUTED         REFUTED          SUPPORTED
        └───────────────┼───────────────┘
                        ▼
                 TWO-LAYER VERDICT
        benchmark: SUPPORTED   ·   implementation: REFUTED / SUPPORTED
```
> **Engines evolve. Benchmarks accumulate.**

An engine is a *specimen*, not the product. Credibility is not a passing score —
it is a trail of **honest failures on a benchmark that never moved to accommodate them.**

## Architecture (4 layers)
```
Layer 1  framework/     kernel.mjs (pure eval) + run.mjs (CLI/IO shell)  [the runner]
Layer 2  benchmark/     H0 · H1 · H2 · H3 · H4 · H5 — engine-agnostic, IMMUTABLE (schema_version'd)
knowledge/              Knowledge Packages (human-confirmed domain knowledge; H4 lifecycle lives here)
Layer 3  engines/       observation · matcher · grounding · resolution · transition · referential — SWAPPABLE
Layer 4  (in kernel)    evaluate → Regression / Refutation / Guard + two-layer Verdict
connectors/  sdk/ (contract·validate·fixtures·collect·pipeline·proof) + integration/ (Integration Kernel: auth·transport·retry·pagination) + html/ + json/ + azure-devops/ + jira/ — evidence → input
kernel-tests/           golden.mjs — the benchmark of the framework itself
reports/                run outputs (each stamped with run_id · timestamp · framework_version)
```

## Run
The front door is the `avf` CLI (`avf run · report · dashboard · review · simulate` — see
[docs/quickstart.md](docs/quickstart.md)). Every combination below also runs directly via
`node framework/run.mjs <hypothesis> <engine@version>`:
```
node bin/avf.mjs run <hypothesis> <engine@version>    # or: node framework/run.mjs <h> <engine@version>

node run.mjs h0 observation@v0        # -> REFUTED  (RH0a: locale variance read as instability)
node run.mjs h0 observation@v0.1      # -> SUPPORTED (invariant/variant split)

node run.mjs h1 matcher@v0            # -> REFUTED  (RH1a: 1 critical confident-wrong, no owner)
node run.mjs h1 matcher@v0.1          # -> SUPPORTED (owner partition)

node run.mjs h2 grounding@v0          # -> INVALID  (over-reach on guard + misses RH2b)
node run.mjs h2 grounding@v0.1        # -> INVALID  (regresses the benign relabel)  ← open frontier

node run.mjs h3 resolution@v0         # -> REFUTED  (RH3a/RH3b, 2 critical confident-wrong)
node run.mjs h3 resolution@v0.1       # -> REFUTED  (RH3c-001, DAG assumption)
node run.mjs h3 resolution@v0.2       # -> SUPPORTED

node run.mjs h4 transition@v0         # -> INVALID  (over-reach guard + illegal edges) [added in Evolution]
node run.mjs h4 transition@v0.1       # -> SUPPORTED (lifecycle-aware, DEFERs outside lifecycle)

node run.mjs h5 referential@v0        # -> INVALID  (trusts the test result; follows no reference)
node run.mjs h5 referential@v0.1      # -> INVALID  (refuted by REAL data: only knew the PR merge commit)
node run.mjs h5 referential@v0.2      # -> SUPPORTED (build commit valid if it is the PR's merge OR source commit)
node run.mjs h5 referential@v0.3      # -> SUPPORTED (build->PR via sourceBranch refs/pull/{id}/merge — real ADO link)
```
Swap the engine; the benchmark is untouched; the verdict tiers itself.
Note **H2**: no engine reaches SUPPORTED yet — the runtime *shows* the semantic frontier
(hypothesis SUPPORTED, every implementation INVALID) instead of hiding it in a doc.

## The kernel criterion (why Layer 1 is "done")
Adding a whole new hypothesis costs **exactly two things and no core change**:
1. one benchmark package — `benchmark/<h>/{manifest.yaml, load.mjs}`;
2. one engine adapter per engine — `engines/<name>/<version>.mjs` implementing the contract.

The evaluation core `framework/kernel.mjs` was written **once** and never edited to add
H0, H1, H2 on top of H3. It is hypothesis-agnostic: it compares an engine's `decision`
string to a case `oracle` string, treats `'DEFER'` as the universal abstain, and tiers
the verdict by case role. `framework/run.mjs` is only a thin CLI/IO shell around it.
The contract lives in `engines/contracts/engine.mjs`:
```
engine = { id, version, kind, capabilities[], evaluate(input) -> { decision, confidence?, evidence?, version } }
```

### The three invariance laws
> 1. (Project Horizon) A **benchmark must not change to accommodate an engine.**
> 2. (AVF kernel) The **kernel must not change to accommodate a connector or a hypothesis.**
> 3. (AVF governance) **Evolution must not break audit.**

Law 3 is what `schema_version` (a benchmark the kernel cannot read is refused, not guessed),
the `run` block (`run_id` · `timestamp` · `framework_version`), and `capabilities`
(described, never depended on) exist for. They are **governance**, not execution.

A fourth law governs *where knowledge lives* (separation, not invariance):
> 4. **Vocabulary belongs to adapters. Meaning belongs to normalization.**

An adapter knows `"Microsoft.VSTS.Common.Priority"` and `"System.State"` — what a source *calls*
things. It must **not** know that `"High"` equals `1` — that is meaning, and it lives in exactly
one `normalize()`. This keeps business knowledge from scattering across every connector: Jira,
ServiceNow, GitHub Issues each add only a `Vocabulary → JSON Vocabulary` adapter; normalize is
never rewritten.

If a future connector (Azure DevOps, Playwright, …) forces an edit to `kernel.mjs`, the
connector is not special — the kernel was not general enough. The **Golden Kernel Tests**
(`kernel-tests/golden.mjs`) are the benchmark of the framework itself; they hold this line:
```
node kernel-tests/golden.mjs
  Test 1 — a correct engine on a well-formed benchmark -> SUPPORTED
  Test 2 — an engine that THROWS does not crash the kernel; it is REFUTED, decision=ERROR
  Test 3 — a brand-new hypothesis id (H9) runs with NO edit to the kernel
  Test 4 — a benchmark whose schema_version the kernel cannot read is rejected, not run blind
```

### Longevity fields (audit, not runtime)
- **`schema_version`** at each benchmark root — the kernel refuses a benchmark it cannot
  read instead of guessing. Benchmarks may evolve; the runner stays honest about which it reads.
- **`capabilities[]`** on each engine — declarative metadata (`['authority','cycle_detection']`).
  The runner never reads it (staying agnostic); a dashboard uses it to answer *"which engine
  supports which assumption?"* without hard-coding.
- **`run` block** in every report — `run_id`, `timestamp`, `framework_version`, `schema_version`.
  Two months later a `report.json` still tells you which kernel produced it.

## The two ideas that make this different from a test suite
1. **Case roles.** Every benchmark case has a role:
   - `regression` — behavior that must never break;
   - `refutation` — designed to break weak engines;
   - `guard` — the engine must **not** over-reach (must DEFER when it cannot decide).
   A mature benchmark has all three (not only refutations, not only regressions).
2. **Two-layer verdict.**
   - **Hypothesis verdict** — owned by the benchmark (human-confirmed oracles). It
     answers *"is the research direction still standing?"* — NOT computed from any engine.
   - **Implementation verdict** — computed from a specific engine run. It answers
     *"does this engine realize it?"*
   They can be true at once: **Hypothesis SUPPORTED, Implementation REFUTED.**

## Deliberately NOT in this framework (they are research knowledge, not runtime)
- the difficulty/knowledge gradient (representation → structure → semantics),
- the "Frontier" (no `SemanticEngine` placeholder),
- the Popper phases (A/B/C) — that is research history, not architecture.
See `../docs/PROGRAM-SPECIFICATION.md` for the research this is derived from.

## MVP v0.1 scope (done)
- Six hypotheses **H0 · H1 · H2 · H3 · H4 · H5** run on one unchanged runner (H4/H5 added in Evolution, no kernel edit).
- Fourteen swappable engines across six families behind a single Engine Contract.
- Each case classified as regression / refutation / guard; two-layer verdict emitted.
- Kernel criterion met: new hypothesis = 1 benchmark package + adapters, **no core edit**.

## The contracts — two kinds
Runtime contracts define **how the system runs**; governance contracts define **how it is trusted**.

### Runtime Contracts
```
Connector  →  Benchmark  →  Engine
 (evidence)    (what/oracle)  (means)
     └───────────── kernel sees only Benchmark ──────────────┘
```
- **Connector Contract** (`connectors/sdk/contract.mjs`) — a `fetch*` family + a pure pipeline
  `raw → normalize() → canonical → materialize() → input`:
  - the `fetch` family (`fetchFromString` / `fetchFromFile` / … , `fetch()` a thin dispatcher)
    is the only code that knows HTML/ADO/Jira/an API;
  - **`normalize()`** (optional) solves **FORMAT** — `High` | `HIGH` | `1` collapse to one
    canonical value; a source's private keys (`System.State`) become canonical (`state`);
  - **`materialize()`** solves **MEANING/shape** for the engine.
  A connector produces input, **never the oracle** — oracles stay human-confirmed, so an evidence
  source enters without breaking "the benchmark is human-owned". Its product is a
  **`MaterializedInput = { input, provenance }`** (via `sdk/collect.mjs`); the loader takes
  `.input`, and `provenance` (`connector · source · fetched_at · checksum`) is for **audit** —
  the kernel never sees it. `normalize()` obeys exactly the laws `materialize()` does.
- **Benchmark Contract** — `schema_version` + `{ hypothesis, cases:[{id, role, oracle, input}] }`.
- **Engine Contract** — `{ id, version, kind, capabilities[], evaluate(input) -> { decision } }`.

### Governance Contracts
- **Proof Contract** (`connectors/sdk/proof.mjs`) — the shared vocabulary every connector stage
  emits: `{ kind: Evidence|Semantic|Projection|Replay, artifact, verdict: SUPPORTED|REFUTED|N/A,
  reason }`. HTML, JSON, Azure DevOps all emit the *same* shape, so a dashboard renders Proof
  without knowing which connector produced it. It makes the connector layer **self-describing**,
  the way the kernel's two-layer verdict object already does for evaluation — **one system, one language**.
- **Oracle Contract** *(documented — to formalize after Evidence Sources stabilize;
  not enforced in code in v0.1)*: an oracle is created or confirmed **only by a human**; it may
  change but only **with history and a reason**; a **connector may not mint** one; an **engine may
  not edit** one; the **kernel only reads** it. The technical contracts keep the machinery honest;
  this one keeps the *truth* honest.

### A connector is a proof pipeline (four kinds of proof)
It is not just ETL — across the pipeline a connector proves four different kinds of evidence,
each standing behind its own invariant standard:

| Stage | Proves | Invariant standard |
|-------|--------|--------------------|
| `fetch` | **Evidence Proof** — acquired the right evidence | Evidence Fixture |
| `normalize` | **Semantic Proof** — meaning unchanged | Equivalence Fixture |
| `materialize` | **Projection Proof** — projects to benchmark input | Expected Input |
| `replay` | **Replay Proof** — reproducible over time | Replay Artifact |

### Connector guarantees (`npm run test:connectors`)
Applied to **every pure stage** — `normalize()` obeys the same laws as `materialize()`:
- **Stage verdicts** — each stage reports its own `SUPPORTED | REFUTED | N/A` with a reason and
  *which kind of proof* it delivered. The kernel never sees these; the SDK does — which is what
  makes debugging a real source (ADO) tractable.
- **Determinism + no mutation** — a stage run twice → identical, and its input untouched.
- **Referential transparency** — each stage runs on a **deep-frozen** input; a connector that
  even *attempts* to write its input is rejected *before* it can, not after.
- **Semantic Equivalence Sets** — the **fixture** declares which raws mean the same thing
  (`High`/`HIGH`/`1`); the connector must collapse them to one canonical. Equivalence is
  *declared, never inferred by the connector*. A declared-distinct set must **not** collapse —
  normalize fixes format, not truth.
- **Replay (two hops)** — a saved envelope stores `raw → canonical → input`; replay must
  reproduce both. Storing canonical (not just input) **localizes drift**: a broken `raw→canonical`
  is `normalize`, a broken `canonical→input` is `materialize` — no guessing. No network, no live
  page. If it drifts, the connector is no longer trustworthy. *This is what audit actually means.*

## Versioning (`framework_version` semver, so audit means something)
- **Major** — the **Kernel Contract** changes (breaking): the shape of `evaluate()`, the verdict
  object, or the benchmark/engine contracts. Old reports may not be comparable.
- **Minor** — a Connector or Engine capability is **extended, backward-compatible**
  (new connector, new engine version, new optional field). Old runs still replay.
- **Patch** — bug fix / optimization, **no behavior change**. Same inputs → same verdict.

## A recursive discipline
```
Project Horizon:   Benchmark  →  Engine      (an engine is judged by an unchanging benchmark)
AVF:               Golden Benchmark  →  Kernel   (the kernel is judged the same way)
```
The framework holds itself to the exact discipline it imposes on engines.

### The one pattern that repeats at every layer
Every layer of AVF is the same shape — an evolving component behind an invariant standard:

| Layer | Invariant standard (comes first) | Evolving component (comes after) |
|-------|----------------------------------|----------------------------------|
| Engine | Benchmark | Engine |
| Kernel | Golden Kernel Tests | Kernel implementation |
| Connector | Evidence Fixtures | Connector |
| Normalize | Equivalence Fixtures | Normalize implementation |

> **The architectural law of AVF: every evolvable component must have an invariant standard
> standing before it.** "Implementation follows benchmark" — first proven for engines — is not a
> local choice; it is how you add *any* new layer without losing the philosophy. A new layer earns
> its place by first writing the invariant it will be judged against.

Generalized one level further, the whole system is an alternation of locked artifacts and
transformations — **Transformation follows Artifact**:
```
Raw → normalize → Canonical → materialize → Input → evaluate → Decision → tier → Verdict
    (each transformation stands behind an artifact that was locked first)
```
Every transformation sits after an artifact that was fixed before it. That is *why* replay works,
and *why* audit works: there is always a prior locked artifact to reproduce and check against.

## Three phases — three different questions
From here on, Project Horizon is not one project but three development lines, each with its own
success criterion. Foundation is closed; the future lives in the other two.

```
Foundation                 Integration                Evolution
──────────                 ──────────                 ──────────
Research                   Azure DevOps ✓             H4 ✓ (new hypothesis)
Kernel                     Jira ✓                     Engines · Benchmarks
Connector SDK              GitHub · ServiceNow …      Research (new H)
Proof Architecture         (evidence sources)
── closed ──               ── proven (2 sources) ──   ── first proof landed ──
```

| Phase | Central question | Success criterion |
|-------|------------------|-------------------|
| **Foundation** | *How is the system built?* | Is it **general**? |
| **Integration** | *How does it connect to the real world?* | Is it **reusable**? |
| **Evolution** | *How does it keep learning and improving?* | Does the benchmark still hold? |

### One law per phase — a meta-tier for verifiable evolution
This is no longer a framework roadmap; it is a **research methodology**. Each phase contributes one
law, and together they are the conditions under which the system can *evolve while staying verifiable*:
```
Verifiable Truth
├── The Proof Principle          — correctness            (Foundation)
├── Source Substitution          — source-independence     (Integration)
└── Additive Knowledge           — knowledge-accumulation  (Evolution)
```
Correct transformations (Proof), independent of where evidence comes from (Substitution), and new
truth added without disturbing old truth (Additive). Take away any one and evolution stops being trustworthy.

An evidence source (Azure DevOps, Jira, GitHub, ServiceNow — later Figma, Confluence, Slack, email,
PDF, logs) does not *change* the Foundation; it *joins* it, always in the same shape:
`Evidence Source → Adapter → Proof Pipeline`.

**The completeness guard.** When adding a source, what you are *forced* to change tells you what is
missing — and it distinguishes a Foundation gap from an Integration gap:

| If a connector must edit… | then… |
|---------------------------|-------|
| the Kernel | Foundation is incomplete |
| the Proof Contract | Foundation is incomplete |
| the one `json.normalize` | Foundation is incomplete |
| the doctrine | Foundation is incomplete |
| the **Integration tests** (`*.test.mjs`) | the **Integration abstraction** is incomplete |
| the **Integration Kernel** (copy retry/auth/pagination) | the **Runtime abstraction** is incomplete |

Foundation should change only when a genuinely missing architectural principle is found — never to
accommodate a source. Integration now has its own golden tests (`live.test.mjs`), so it is held to
the same standard the kernel is. A stable core with a growing ecosystem is the mark of a mature platform.

### Source Substitution Principle (Integration's law)
> **If two evidence sources produce the same `Fetched Envelope`, the entire downstream pipeline must
> produce the same Proof** — only `source` and `fetched_at` may differ.

This is more general than any one connector. Whatever the acquisition — Azure DevOps REST, Jira,
GraphQL, Kafka, a webhook, a CSV import — it must reduce to *different acquisition → same Fetched
Envelope → same Proof*. `live.test.mjs` is the executable form of this law: a fixture payload and a
(stubbed) live payload of the same shape flow through the same pipeline to identical canonical + input.

### Additive Knowledge Principle (Evolution's law)
> **A new benchmark is *added*; it never changes the kernel, an existing benchmark, or an existing
> oracle.** New knowledge accumulates behind the same foundation.

Evolution's guard, alongside the others:

| If a new benchmark forces an edit to… | then… |
|---------------------------------------|-------|
| the Kernel | Foundation is incomplete |
| an existing benchmark | the **Benchmark abstraction** is incomplete |
| an existing oracle | the **Oracle abstraction** is incomplete |

**H4 (Transition Validity under a Declared Lifecycle)** is the first proof (`npm run test:evolution`):
a genuinely new kind of knowledge (a state machine — not representation/identity/semantics/authority)
was added with **one benchmark package + engine adapters and zero kernel edits**, while H0–H3 and
their oracles stayed byte-for-byte the same and green. `transition@v0` is refuted (over-reaches the
guard, allows illegal edges); `transition@v0.1` (lifecycle-aware, DEFERs outside the lifecycle) is
SUPPORTED — the same refute→improve loop, now on the research layer.

### Closing the loop — Evolution ∩ Integration (a new kind of proof)
Foundation, Integration, and Evolution were each proven *separately*. The **Evolution Integration
Bridge** proves the composed claim they had not: **a research benchmark can consume real evidence
with no special pipeline** (`npm run test:bridge`).
```
ADO updates (real shape) → toTransition → { from, to } ┐
H4 benchmark ───────────────────────────→ lifecycle ──┴→ transition@v0.1 → VALID / INVALID / DEFER
```
A work item gives one *state*; H4 needs a *transition*, so the evidence is the work item's **state
history** (`_apis/wit/workItems/{id}/updates`). The adapter extracts `{from,to}` (ADO vocabulary;
values canonicalized by the one `json.normalize`); the **lifecycle stays benchmark-owned**. The engine
and lifecycle are *exactly* the H4 fixture's — nothing bespoke. Fixture-first proves it (illegal
`new→closed` → INVALID, `active→"in review"` → DEFER, `active→closed` → VALID); the live path reuses
the Integration Kernel:
```bash
AZDO_PAT=<pat> node evolution-tests/bridge.run.mjs <org> <project> <workItemId>
```
This is the first closed chain `REST → evidence → canonical → benchmark → engine → verdict`, and the
foundation on which Automation Validation (adding a human oracle) will later stand — one link at a time.

### DEFER is evidence of missing knowledge (a new layer was discovered)
Run live on work item 9283, the bridge returned `{ committed → ready for testing } → DEFER`. That is
not a gap in the code — it is the system, on real data, **refusing to guess** about a state
("committed") outside the lifecycle it was given. A weaker engine would have over-reached to INVALID;
`transition@v0.1` correctly DEFERs. So the Oracle Contract stopped being a README idea and became a
need the system *itself* surfaced:
```
Evidence → Benchmark → Engine → DEFER → (knowledge required) → acquire → SUPPORTED
```
> **Doctrine — Don't Guess. Acquire Knowledge. Then Judge.** DEFER is not "unhandled"; it is a formal
> request for a **Knowledge Package**. Knowledge is not a precondition of every benchmark — it is
> *activated by* a DEFER, only where a real knowledge gap exists.

This revealed a distinct architectural layer — **Knowledge Packages** (`knowledge/<name>/`) — separate
from benchmark, connector, and engine. A Knowledge Package is human-confirmed *domain* knowledge (a
lifecycle + its human-confirmed transition cases) that many benchmarks share:
```
Evidence → Knowledge Package → Benchmark → Engine → Verdict
```
An **Executable Benchmark = benchmark logic + a Knowledge Package**. H4 is now lifecycle-*agnostic*;
it consumes a package (`knowledge/generic/`, later `knowledge/taggle/`, `knowledge/jira-scrum/`,
`knowledge/azure-agile|basic|cmmi/`) chosen by `AVF_KNOWLEDGE` — the benchmark logic never changes to
add a process, so the repository grows in *knowledge*, not in benchmark variants. This is Additive
Knowledge in its truest form: what accumulates is domain knowledge.

**Knowledge Package guard** (alongside the others): if adding a new process (Taggle, Jira Scrum, …)
forces an edit to H4's benchmark logic, the **Knowledge Package abstraction** is incomplete — a new
process must be *only* a new package.

#### Observed ≠ Allowed — the extractor supplies facts, the human supplies policy
A Knowledge Package is **seeded from a system's real configuration**, not typed from memory — but only
the parts that *are* facts. Azure DevOps has **no static allowed-transition table**: transitions are
effectively any→any, gated at write time by **revision (optimistic concurrency)**, rules, and
permissions. So the extractor (`connectors/azure-devops/process.mjs`) supplies only:
- **`states` + `categories`** — facts from config;
- **`observed.transitions`** — transitions *seen in item history* (via `observedTransitions`): **evidence
  that a transition happened, which is not proof it is permitted** (and an unseen transition is not proof
  it is forbidden).

**`allowed` is left empty on purpose** — it is **organization policy**, pure Oracle Knowledge that only a
human declares. This is why the live 9283 run returned DEFER: not a data-access gap, a **policy-knowledge**
gap. `ADO ≠ Organization Knowledge` — ADO may technically permit `committed → done`; company policy may forbid it.
```
ADO → states + observed transitions (evidence) → DRAFT → human declares `allowed` (policy) → confirmed:true → usable
```
The loader **refuses any package with `confirmed !== true`** (`assertUsable`) — a machine proposes facts,
a human ratifies policy.

#### Policy modes — closed-world states, open-world transitions
A lifecycle package declares `policy.mode`, and **one engine** (`transition@v0.2`) reads it:
- **restrictive** — a transition must be in `allowed`, else INVALID (a strict state machine).
- **permissive** — a transition is VALID *unless* in `forbidden` (ADO-like: any→any minus a few bans).
- both: a state outside `states` → **DEFER** (`knowledge:"missing-state"`).

Since Azure DevOps is permissive, the extractor seeds drafts as `mode: permissive` with an empty
`forbidden` — the org declares only the *few edges it forbids*, never the whole allowed graph. The
architecture leaves room for a future `mode: conditional` (e.g. a reopen allowed only for a role)
without changing the kernel or the benchmark — just a new engine mode.
```bash
# ALL work-item types in one pass — one draft package per type:
AZDO_PAT=<pat> node connectors/azure-devops/process.run.mjs <org> <project>
#   -> knowledge/<org>-bug/lifecycle.DRAFT.json, knowledge/<org>-user-story/lifecycle.DRAFT.json, …
# or one type:
AZDO_PAT=<pat> node connectors/azure-devops/process.run.mjs <org> <project> <workItemType>
# Each draft is mode:permissive with forbidden:[]. For each: declare the few `forbidden` edges (org policy),
# set confirmed:true, rename lifecycle.DRAFT.json -> lifecycle.json, then AVF_KNOWLEDGE=<org>-<type>.
```

### The repository increasingly holds locked *knowledge*, not code
Artifacts like `cross-source.json`, the equivalence fixtures, and each benchmark manifest describe
**knowledge**, not implementation: what a source calls things, which artifacts are equivalent, what
the human-confirmed oracle is, what a lifecycle permits. As AVF climbs toward research, more of the
repo becomes *locked knowledge* (equivalence · benchmark · hypothesis · oracle · lifecycle fixtures)
and less of it is code. That is the shape of a platform whose value is its accumulated, audited truth.

## Knowledge dimensions — the research map
The hypotheses are not a list of benchmarks; they are a **map of the kinds of knowledge** AVF can
represent and verify. Each first hypothesis of its kind opens a *new axis*:

| Knowledge dimension | First hypothesis | What it introduced |
|---------------------|------------------|--------------------|
| Representation | **H0** | stable observation of one logical state |
| Identity | **H1** | same thing across safe change |
| Semantics | **H2** | meaning under representation equivalence *(open frontier)* |
| Authority | **H3** | resolution under conflicting claims |
| Lifecycle / Transition | **H4** | a state machine — the first *temporal/process* axis |
| Reference / Relationship | **H5** | reference resolution — follow refs across evidence, check they co-refer |
| … | **H6** | *a new axis — must pass the Reduction Test below* |

A hypothesis is defined by the **reasoning primitive** its engine must perform, governed by two rules —
a principle that states the goal and a test that refutes candidates:

> **Dimensional Expansion Principle** *(principle).* Each hypothesis opens **exactly one new reasoning
> primitive** — a way the engine must *think* that no earlier hypothesis required.
>
> **Reduction Test** *(the refutation).* A candidate Hn does **not** earn a new dimension if its primitive
> can be produced by an **existing engine + a new Knowledge Package + a loader reshape**. It is
> implementation-independent: it only asks *"must the engine reason in a new way?"*

**This was used to retract a candidate — the first time the Principle refuted, not created.** The earlier
"H5 = Composite Evidence" (`state ∧ test ∧ pr → READY`) *failed* the Reduction Test: its reasoning is
per-field **membership + boolean AND + unknown→DEFER**, all primitives H0/H2/H4 already have; the
"many inputs" is an input-shape change, not a new *kind* of reasoning. So composite bundles are demoted
to a **Knowledge Package pattern** (see Type A below), not a hypothesis. The surviving **H5 = Referential
Integrity** passes: its engine must *follow references across evidence* (`test → build → commit`, `pr →
commit`, `pr → work_item`) and decide they converge on one object — reference resolution, a primitive no
package on H0–H4 can supply. (In its *flat* form `a == b` it would reduce to H0; only the transitive form earns it.)

### Two kinds of knowledge (the taxonomy the Reduction Test produced)
The Reduction Test draws a line that answers *"when do I write a new benchmark vs. just a package?"*:

| | **Type A — Knowledge Package** | **Type B — Reasoning Primitive** |
|---|---|---|
| What it is | domain knowledge, human-confirmed | a new way the engine must think |
| Examples | lifecycle · release requirements (composite) · authority precedence · synonym tables | semantic equivalence · authority resolution · transition validity · referential resolution |
| Engine | **unchanged** — it consumes the package | **must change** — a new engine/version |
| Earns an H-number? | no (it's authored) | yes (it's a hypothesis) |

Type A grows the *knowledge* (add a package, no benchmark); Type B grows the *map of reasoning* (a new
hypothesis, which must pass the Reduction Test first). Composite bundles are Type A; H5 Referential is Type B.

### The Reality Test — a primitive matures only on real evidence
The Reduction Test is *theoretical* (does the engine reason in a new way?). A second, *empirical* gate
completes it:

> **Reality Test.** A reasoning primitive is not *mature* until it has survived on **real evidence**, not
> just fixtures. A candidate becomes a settled dimension only after: (1) a new primitive, (2) a fixture
> benchmark, (3) an engine, (4) **real evidence**, (5) *then* it holds its H-number.

This is Popperian to the core: a primitive must survive both the theoretical refutation (Reduction) and
contact with reality (real data) before it is a foundation for opening the next dimension. Maturity by hypothesis:

| H | Primitive | Fixture | Real evidence |
|---|-----------|:-------:|:-------------:|
| H0 | representation invariance | ✅ | ✅ (research capture) |
| H1 | identity partition | ✅ | — |
| H2 | semantic equivalence | ✅ (open frontier) | — |
| H3 | authority resolution | ✅ | — |
| H4 | transition validity | ✅ | ✅ (ADO updates → verdict on work item 9283) |
| H5 | referential resolution | ✅ | ✅ resolves the **real** ADO chain end-to-end; DEFERs honestly when test evidence isn't published |

**Reality did what fixtures could not — seven times.** Running H5 live against Taggle's Azure DevOps
peeled back one hidden layer after another, and the engine (or the adapter) was corrected at each — the
first time *live evidence*, not a fixture, drove refutation:
1. **PRs live on child tasks**, not the parent work item → the runner fans out one level (children + related).
2. A PR-validation build runs on a **merge-preview commit** (`refs/pull/{id}/merge`) equal to neither the
   PR's source nor merge commit → commit-SHA matching can *never* work.
3. The reliable build→PR link is the **PR id in `build.sourceBranch`**, not a commit → `referential@v0.3`.
4. Old PRs' builds are **purged by retention** → DEFER (the evidence no longer exists) is correct.
5. Not every repo has PR CI.
6. The `test/runs?buildIds=` filter is unreliable → use `buildUri`.
7. Work items live in one project, **code + CI in another** (`Taggle Health App - Research` vs `THKMC RPM`) →
   the runner follows the project GUID carried in the PR's ArtifactLink, so cross-project resolves.

The chain now assembles fully on real data (work item → child → PR → build, cross-project). The live verdict
on a recent PR is **DEFER** — and *correctly so*: the build succeeds and even collects code coverage, but the
pipeline **publishes no Test Run**, so there is no test artifact to follow. H5 refuses to equate "green build"
with "tested" — it DEFERs for lack of traceable test evidence (and incidentally surfaces a real process gap:
tests run but results aren't published). **That is H5 passing the Reality Test in its deepest sense:** it
processes messy real evidence at every layer and stays honest at every verdict — including saying *"I don't
have the evidence to decide."* A CONSISTENT/MISMATCH is provable wherever a pipeline *does* publish test runs.
```bash
AZDO_PAT=<pat> node evolution-tests/referential-bridge.run.mjs <org> <project> <workItemId>
AZDO_PAT=<pat> node evolution-tests/referential-bridge.run.mjs <org> <project> pr <prId> <repoGuid> <prProjectGuid> [testRunId]
```

### Reality-driven research — how H6 is allowed to be born
H0–H5 are a **minimum complete basis**, and the roadmap now inverts: research does not go hunting for
reality, **reality summons research.** A new hypothesis must not be brainstormed — it is born only when
real data breaks in a way the existing basis cannot even represent.
```
Reality Test  →  a real case cannot be decided  →  classify WHY  →  (only one kind earns an H)
```
The discipline is to classify *why* something can't be decided — three distinct "can't decide"s:

| Signal | Meaning | Response |
|--------|---------|----------|
| **REFUTED** (a critical case is wrong) | the engine is too weak | ship engine `vX+1` (same hypothesis) |
| **DEFER — missing knowledge** | the domain fact is absent | author a **Knowledge Package** (Type A) |
| **DEFER — missing *primitive*** | no existing reasoning *kind* can express the question | **only this earns a new H** — after it passes the Reduction Test |

So H6 is not a slot to fill. It is a thing to *wait for*: a live DEFER that is neither a weak engine nor a
missing package, but a question outside representation / identity / semantics / authority / lifecycle /
reference. Until real data produces that, opening H6 would violate the very Reduction Test that H5 survived.
This is the Popperian core made into a growth rule: **the program grows only where reality proves it must.**

Candidate next axes (each genuinely new, not another transition): **temporal validity** (time-dependent
truth), **composite evidence** (many signals combined), **probabilistic evidence** (confidence/degree),
**conflicting authorities** (two oracles in tension). H0–H4 already cover representation → identity →
semantics → authority → process; H5 should extend the *map*, not thicken a line already on it.

## What AVF is becoming — an evidence-centric validation platform
It looks less and less like a traditional QA framework. Each layer has exactly one job and
does not reach into the next:
```
Evidence Sources   provide raw data (Azure DevOps · Jira · PRD · HTML · JSON)
Connectors         transform raw -> standardized input (+ provenance for audit)
Knowledge Packages human-confirmed domain knowledge (lifecycles, equivalences) — shared, activated by DEFER
Benchmarks         hold the human-confirmed oracles (benchmark logic + a Knowledge Package)
Engines            make decisions
Kernel             evaluates and issues the verdict
```
A benchmark does not evaluate a *system* — it evaluates the *evidence a connector materializes*, using
*knowledge a human confirmed*.

## Roadmap (Integration phase)
Foundation is done (see *Three phases* above); the roadmap now lives in Integration.
```
Sprint 1    Azure DevOps Live       done (verified on real data)
Sprint 1.5  Integration Kernel      done  (connectors/integration/: auth · transport · retry · pagination)
Sprint 2    Jira                    done  (Source Substitution #2 proven — same pipeline below the adapter)
Sprint 3    GitHub
Sprint 4    ServiceNow
```
- **Integration Kernel** (`connectors/integration/`, Sprint 1.5 done) — auth · transport · retry ·
  pagination, extracted from `azure-devops/fetch.mjs` into one reusable core. It owns *how* to talk to
  the outside world and knows nothing about any source's vocabulary or meaning. This is the Integration
  analogue of the Foundation kernel: a new live connector *reuses* it instead of copying it (Jira's
  `fetch.mjs` imports the same `auth`/`transport`/`get`). ADO's live tests stayed green through the
  extraction — a behavior-preserving refactor.
- **Sprint 2 — Jira (done), four steps, fixture-first**: (1) Jira fixture (raw REST payload) →
  (2) cross-source vocabulary comparison (ADO `System.State` vs Jira `fields.status.name`) →
  (3) Jira adapter (`Vocabulary → JSON Vocabulary`) → (4) Jira fetch (over the Integration Kernel).
  All locked criteria held: adapter knows only Jira's vocabulary; **no** edit to `json.normalize`,
  `json.materialize`, the Proof Contract, or Foundation; all Foundation tests unchanged.
  **Source Substitution #2 proven** (`npm run test:jira`): ADO and Jira reduce to the *same* canonical
  and input, and `ado.materialize === jira.materialize === json.materialize` — the pipeline below the
  adapter is *literally the same code*. Integration now has two independent sources confirming one
  architecture: **extension, not modification.**
- **Connector SDK** (Foundation, done) — Contract + Validation (determinism · referential
  transparency) + Test Fixtures + Replay + Proof. Any teammate can add a connector with the same
  harness, **without understanding the kernel** — the point of a closed Foundation.
- The connector order is an **order of responsibility**, not just of delivery — each first
  connector of its kind exists to establish a new SDK capability:

  | Connector | Proves | Status |
  |-----------|--------|--------|
  | **HTML** | `parse` — raw surface → structured input | done |
  | **JSON** | `normalize` — many formats → one canonical, meaning unchanged | done |
  | **Azure DevOps** | `fetch` — a real API, nothing new downstream | done (live verified) |
  | **Jira** | `source substitution` — a 2nd source, same pipeline below the adapter | done (fixture) |
  | **GitHub / ServiceNow / Playwright** | (more sources, same shape) | later |

  Ordered so the purest responsibility is proven first: by the time Azure DevOps arrives, only
  `fetch` is new — parse and normalize are already trusted, and the engine never sees ADO's format.
- **Evidence-fixture-before-connector** — Azure DevOps was added as
  `ADO payload fixture → ADO connector → ADO live`, **not** connector-first. The fixture
  (`connectors/azure-devops/fixtures/work-items.json`) holds *raw REST payloads, un-cleaned* (nested
  `fields`, dotted `System.*` keys, numeric priority) plus the canonical/input each must produce.
  This is "implementation follows benchmark", extended: **connector implementation follows evidence fixture.**
- **Azure DevOps brings exactly ONE new capability — evidence acquisition** — so it is split so
  nothing downstream is duplicated:

  | Sub-step | File | Owns | Status |
  |----------|------|------|--------|
  | 1. Fetch adapter | `azure-devops/fetch.mjs` | PAT · URL · retry · pagination → Fetched envelope | done |
  | 2. Shape adapter | `azure-devops/adapter.mjs` | ADO payload (`fields`, `System.*`, `Microsoft.VSTS.*`) → plain JSON | done |
  | — reuse | `json.normalize` / `json.materialize` | value-normalize + projection (one place only) | delegated |
  | 3. Live | `azure-devops/fetch.mjs` (`fetchLive`) | real REST instead of the fixture | code + integration-proven; awaits a real PAT run |

  The connector's `normalize` is `json.normalize(toJson(raw))` and its `materialize` **is**
  `json.materialize` — normalize/materialize logic exists in exactly one place.
  **Discipline for step 3:** `fetchLive()` does *only* `REST API → Fetched envelope` — no parsing,
  no shaping, no normalize. Everything after (`toJson → json.normalize → json.materialize`) is the
  already-proven pipeline. Going live changes the *source of evidence*, never the *proof process*.

### Integration Sprint #1 — Azure DevOps Live (Fixture Path == Live Path)
`fetchLive()` reads `AZDO_PAT` from the environment, does a REST GET with retry (429/5xx) and
continuation-token pagination, and returns the raw ADO payload **untouched**. It is proven with an
**injected transport** (`npm run test:integration`, no network, no PAT): a canned REST body — the
same shape the fixture locked — flows through the *same* pipeline and yields the **identical
canonical + input**; only `source` and `fetched_at` differ. That is the completion criterion —
`Fixture Path == Live Path` except the evidence source — and the 34 Foundation tests stay unchanged,
so any bug would be Integration's, never Foundation's.

To run it against a real project (the one step that needs a credential — read from env only, never
hard-coded):
```bash
AZDO_PAT=<pat> node connectors/azure-devops/live.run.mjs <org> <project> <workItemId>
```
The bridge runner **auto-selects the Knowledge Package from the work item's own type**
(`System.WorkItemType` → `knowledge/<org>-<type>`); no `AVF_KNOWLEDGE` needed (it still overrides). If
no *confirmed* package exists for that type, the verdict is **DEFER (missing-policy)** — the system
refuses to guess, the same way it DEFERs on a state outside the lifecycle:
```bash
AZDO_PAT=<pat> node evolution-tests/bridge.run.mjs <org> <project> <workItemId>   # picks the package by type
```
It prints the `MaterializedInput { input, provenance }`. (A live *verdict* also needs a human-labelled
oracle — the Oracle Contract — which is Automation Validation, below.)
- **Automation Validation** (goal) — point a connector at a real evidence source; a human labels
  oracles; AVF validates real automation engines, not just fixtures. The benchmark you trust does
  not change, the kernel does not change, and the Engine Contract does not change.
- A `coverage` output (which assumptions each benchmark exercises).
