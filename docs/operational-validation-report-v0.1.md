# Operational Validation Report — v0.1

> First artifact of **R1 (Operational Baseline)**. This is the *machine-executed documentation-fidelity
> pass*: a clean clone driven **verbatim** through `docs/quickstart.md`, recording where the documented
> path diverges from reality. It validates that every documented command *executes as written*. It does
> **not** replace the human pass ("does a first-time user *understand* the path?") — that runs after R1.1
> with a person who has never seen AVF.

## Method

- Fresh copy of the repo into an empty directory, **excluding `node_modules` and `.git`** (a clone-equivalent tree).
- Install from the lockfile, then follow `docs/quickstart.md` step by step, **no improvisation, no prior knowledge, no command edits**.
- **No fixes applied during the pass** (Operational Validation rule): every divergence is only *logged*. Fixes are batched into R1.1 afterward, so the count of real friction on a clean clone stays observable.

**Environment:** Windows 11 · PowerShell · Node v24.11.1 · npm 11.11.0.

## 1. Baseline verification — PASS

| Check | Result |
|---|---|
| Clean copy has no `node_modules` | ✅ |
| `npm ci` (from committed lockfile) | ✅ exit 0 — 0 vulnerabilities |
| `npm test` = **full validation suite** via one entrypoint | ✅ exit 0 — 29 GREEN groups, 0 failed |

The full suite is reachable through a single canonical command (`npm test` → `test:all` → 4 capability stacks). No "remember to run this other test" step remains.

## 2. Quickstart happy path (§0–§5) — PASS, verbatim

| Step | Documented expectation | Actual | Match |
|---|---|---|---|
| examples/minimal, jira, azure-devops | run offline, exit 0 | exit 0 (all three) | ✅ |
| `simulate --verdict DEFER --env production` | ⛔ BLOCK, exit 1 | `Gate: ⛔ BLOCK` exit 1 | ✅ |
| `simulate --verdict DEFER --env sandbox` | ⚠️ WARN, exit 0 | `Gate: ⚠️ WARN` exit 0 | ✅ |
| `simulate --verdict VALID --env production` | ✅ ALLOW, exit 0 | `Gate: ✅ ALLOW` exit 0 | ✅ |
| `run h5 referential@v0.3` | SUPPORTED, writes report | `IMPLEMENTATION VERDICT: SUPPORTED`, `reports/h5_referential_v0.3.json` written | ✅ |
| `run h5 referential@v0` | INVALID (impl.) | `HYPOTHESIS SUPPORTED` + `IMPLEMENTATION VERDICT: INVALID` (two-layer, correct) | ✅ |
| `report … --format md` / `--format pr --gate` | render / gate | exit 0, renders; gate computed | ✅ |
| `dashboard` | writes `dashboard/index.html` | exit 0, file written | ✅ |
| `review --dry-run …` | validates without writing store | exit 0, emits learning suggestion | ✅ |

**The documented newcomer path runs end-to-end with zero hard failures.** The only hard break is a *cross-reference out of* the quickstart, logged below.

## 3. Friction log

Each record is one real, first-time-user-facing divergence on a clean clone.

### F-1 — README "## Run" commands are not executable  · severity: MEDIUM
```
Step         quickstart §2 points to README "Run" section for "every hypothesis × engine combination";
             newcomer copies:  node run.mjs h0 observation@v0
Expected     prints the H0 verdict (REFUTED)
Actual       exit 1 — Error: Cannot find module 'run.mjs' (MODULE_NOT_FOUND)
Root cause   README lines ~102–121 use bare `node run.mjs`; there is no run.mjs at repo root.
             The runner is `framework/run.mjs`. README line 100 already shows the correct form,
             so the block below it contradicts its own header.
Severity     MEDIUM — a documented command fails hard; it is the first thing an engaged reader
             tries right after the quickstart.
Fix proposal fix(docs): replace `node run.mjs ` → `node framework/run.mjs ` in README §Run.
             Verified executable on the clean clone (exit 0). No other wording change.
```

### F-2 — Quickstart mis-describes `npm test`  · severity: LOW
```
Step         quickstart §0:  npm test          # kernel + connectors — should print GREEN
Expected     comment matches what runs
Actual       runs the FULL validation suite (4 stacks, 29 GREEN groups), not just kernel + connectors
Root cause   doc not updated after R1 repointed `test` → `test:all`
Severity     LOW — understates; not a failure, but breaks "docs are a projection of implementation"
Fix proposal docs: comment → "full validation suite"
```

### F-3 — Quickstart install command is not the pinned form  · severity: LOW
```
Step         quickstart §0:  npm install
Expected     a reproducible install for a baseline
Actual       works, but a committed lockfile exists → `npm ci` is the reproducible/pinned form
Severity     LOW
Fix proposal docs: npm install → npm ci
```

### F-4 — Clone Test acceptance is clock-based and duplicated  · severity: GOVERNANCE
```
Step         quickstart bottom — "The Clone Test"
Expected     one canonical acceptance criterion
Actual       repo says "~30 minutes"; the roadmap says "~15 minutes" — two numbers, both time-based
Root cause   acceptance measured by a clock, which depends on network, machine, npm cache, experience
Severity     GOVERNANCE — this is the criterion by which Operational Validation itself is judged
Fix proposal docs: replace the time bound with a time-independent invariant —
             "A first-time user can clone, install, execute the validation suite, and produce one
              artifact by following Quickstart without outside assistance."
             Measured by: zero outside explanation + zero undocumented commands. Not by a clock.
```

## 4. Observations (not friction — recorded, not acted on)

### O-1 — Working surfaces the documented path never reaches
`avf analytics`, `avf decision`, and `avf overview` all exit 0 and write artifacts, but **none appear in the quickstart**. The quickstart's "whole system at a glance" is `avf dashboard`. So a newcomer following the docs never invokes three artifact-writers, and there are two overlapping "at a glance" surfaces (`dashboard` vs `overview`). This is not a newcomer friction (they won't hit it). It is a doc-coverage / possible-surface-duplication signal. **No action** — there is no usage pressure yet; acting now would violate ADR-0006.

## 5. Verdict

- **Baseline (R1 §1–§2): PASS.** Clean clone installs from lockfile and the full suite goes green through one entrypoint.
- **Documented happy path: PASS verbatim.** Every quickstart command executes exactly as written.
- **Real friction on a clean clone: 1 MEDIUM (F-1) + 2 LOW fidelity (F-2, F-3) + 1 GOVERNANCE (F-4).** All four share one nature: *documentation drifted from implementation* — "assembler invents nothing," applied to docs.

The newcomer path itself is solid; the single hard break is a stale cross-link into the README.

## 6. Follow-up — R1.1 (Documentation Fidelity): shipped

Per the no-fix-during-validation rule, nothing was fixed during the pass; the four findings were then batched into R1.1 — three commits, each carrying one kind of truth:

1. `3bcc5d6` `fix(docs): README commands match the implementation` — F-1
2. `ac865a9` `docs: Quickstart matches the Operational Baseline` — F-2, F-3
3. `79623fb` `docs: Canonicalize Clone Test` — F-4

The baseline this report validates was committed as `9aed4a7` (`build: npm test is the full validation suite`), immediately **before** this report — so the record describes a baseline that already exists in history, never one that does not.

Next is not code: the **human Operational Validation** runs with a real first-time user against `docs/quickstart.md`, observed silently — every question they ask ("what do I do here?") is the next, most valuable pressure. If they ask nothing, that silence is the strongest evidence R1 is done.
