# AVF — Quickstart

Goal of this page: from a fresh clone to *seeing the whole pipeline run* in a few minutes —
without Azure DevOps, a CI server, or any credential. If you cannot, this page has failed
its own acceptance criterion (see the bottom).

AVF evaluates automation **engines** against a fixed **benchmark**, then decides what to *do*
about each verdict. The one-line mental model:

```
Evidence → Benchmark → Engine → Verdict → Ruling → (render / gate)
```

## 0. Requirements

- Node.js 18+ (uses only the standard library + `js-yaml`).

```bash
npm ci
npm test          # full validation suite — should print GREEN
```

Prefer to read code over docs? Run the [examples](../examples/) — all offline, no credentials:

```bash
node examples/minimal/example.mjs      # the whole loop in one script
node examples/jira/demo.mjs            # evidence acquisition + source substitution
node examples/azure-devops/demo.mjs    # ADO evidence (live commands in its README)
```

## 1. See a gating decision — `avf simulate` (no evidence needed)

This is the cheapest thing AVF does and the best way to understand it. You hand it a *fake*
verdict; it runs that verdict through the rule engine and shows the resulting **Ruling** —
plus a CI-style exit code. No connector, no benchmark, no network.

```bash
node bin/avf.mjs simulate --verdict DEFER --env production
```

A `DEFER` on `production` matches the default policy and gates the build:

```
**Gate: ⛔ BLOCK** — 2 rule(s) matched; block from: block DEFER on production
gate: BLOCK (exit 1)
```

Change the context and the *action* changes while the *verdict* does not — that is the whole
point of the Rule Engine (policy, not reasoning):

```bash
node bin/avf.mjs simulate --verdict DEFER --env sandbox     # → ⚠️ WARN, exit 0
node bin/avf.mjs simulate --verdict VALID  --env production # → ✅ ALLOW, exit 0
```

Edit [`rules/default.json`](../rules/default.json) to change the policy — no code changes.

## 2. Run a real engine against a benchmark — `avf run`

```bash
node bin/avf.mjs run h5 referential@v0.3
```

This evaluates the `referential@v0.3` engine against the immutable H5 benchmark and writes
`reports/h5_referential_v0.3.{json,txt}`. Swap the engine version; the benchmark never moves:

```bash
node bin/avf.mjs run h5 referential@v0     # → INVALID (trusts the test result)
node bin/avf.mjs run h5 referential@v0.3   # → SUPPORTED
```

(See the [README](../README.md) "Run" section for every hypothesis × engine combination.)

## 3. Render a report, optionally gated — `avf report`

Turn any run's report into a view for humans or machines. Add `--gate` to also compute the Ruling.

```bash
node bin/avf.mjs report reports/h5_referential_v0.3.json --format md
node bin/avf.mjs report reports/h5_referential_v0.3.json --format pr --gate --env production
```

`--format` is one of `md · pr · json · sarif · teams`. With `--gate`, the process exit code is
`1` on BLOCK — drop this straight into a CI step.

## 4. See the whole system at a glance — `avf dashboard`

```bash
node bin/avf.mjs dashboard        # writes dashboard/index.html — open it in a browser
```

## 5. Record a human review — `avf review`

A machine verdict is a claim; a human review turns it into confirmed knowledge (the Oracle
Contract). Use `--dry-run` to validate without writing to the append-only store.

```bash
node bin/avf.mjs review --dry-run \
  --reviewer you --decision confirm --hypothesis H5 --verdict DEFER \
  --reason "pipeline publishes no test run — real process gap"
```

## Where to go next

- **Architecture** — [docs/architecture.md](architecture.md): AVF as a pipeline of proofs, and how each
  module owns exactly one stage of it.
- **Concepts & research** — the [README](../README.md): the Proof Principle, the two-layer verdict,
  benchmarks vs. engines, knowledge packages, the research (Project Horizon).
- **The rule engine** — [`rules/engine.mjs`](../rules/engine.mjs): how a verdict becomes a Ruling.
- **The report views** — [`report/`](../report): one Report, many renderers.

---

## The Clone Test — the acceptance criterion for Packaging

> **A first-time user can clone, install, execute the validation suite, and produce one artifact by
> following this Quickstart — with no help beyond the documentation.** If they cannot, Packaging is
> not done — regardless of how much is written.
>
> Measured by **zero outside explanation** and **zero undocumented commands** — not by a clock. How
> long it takes depends on network, machine, npm cache, and experience; *"needs no one to ask"* is the
> invariant.

This is the same spirit as the Reduction Test and the Reality Test that shaped Project Horizon:
instead of asking *"is it written?"* it asks *"can a newcomer actually use it?"* If any step on this
page requires reading the 690-line README first, or knowledge that lives only in the git history,
that step is the bug — fix the packaging, not the reader.
