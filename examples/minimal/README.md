# examples/minimal — the whole loop, offline

The fastest way to understand AVF. No Azure DevOps, no CI, no network, no credentials.

```bash
node examples/minimal/example.mjs
```

It walks the full pipeline using **only the public API** ([`avf/index.mjs`](../../index.mjs)):

```
Evidence → Benchmark → Engine → Verdict → Ruling → render/gate
```

and shows the two things that make AVF different from a test runner:

1. **The benchmark judges engines; it never moves.** The same immutable H5 benchmark rates
   `referential@v0` as INVALID and `referential@v0.3` as SUPPORTED. Credibility is a trail of honest
   failures on a benchmark that never changed to accommodate any engine.
2. **A verdict is not an action.** The same `DEFER` verdict BLOCKs a production release but only WARNs
   on a sandbox — that split is *policy* (the Ruling), decided by the Rule Engine, never by changing the
   verdict. Renderers just render; they know nothing about rules, policy, or CI.

## Same thing, from the CLI

Every step above is also a one-liner via the `avf` command (see [docs/quickstart.md](../../docs/quickstart.md)):

```bash
node bin/avf.mjs run h5 referential@v0.3
node bin/avf.mjs simulate --verdict DEFER --env production   # → BLOCK, exit 1
node bin/avf.mjs simulate --verdict DEFER --env sandbox      # → WARN,  exit 0
```

## Using AVF as a library

The script imports from the package barrel, the supported surface:

```js
import { run, makeReport, evaluateRules, exitCodeFor, toMarkdown } from 'avf';
// or, from inside this repo:  from '../../index.mjs'
```

That is the same surface the CLI orchestrates — there is exactly one way to run AVF, whether from a
terminal, a test, an IDE extension, or a future REST layer.
