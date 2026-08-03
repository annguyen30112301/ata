# examples/azure-devops — acquiring evidence from Azure DevOps

## Offline (no PAT) — the pipeline

```bash
node examples/azure-devops/demo.mjs
```

Runs the ADO connector over the locked fixture (`connectors/azure-devops/fixtures/work-items.json`).
Azure DevOps contributes exactly **one** new capability — *evidence acquisition* (`fetch`); everything
after it (`normalize`, `materialize`) is delegated to the already-proven JSON connector. The demo shows
two different ADO API shapes of the same work item (the `wit` API and the `analytics` API) reducing to
one canonical — proof that meaning is stable across representations.

## Live (needs a PAT) — the real story

This is where ADO earns its place: real evidence, resolved end-to-end into a verdict. The `AZDO_PAT` is
read from the environment only, never hard-coded. In PowerShell:

```powershell
$env:AZDO_PAT="<pat>"

# H4 — lifecycle/transition: ADO state history → transition → VALID / INVALID / DEFER
#      (auto-selects the Knowledge Package from the work item's own type)
node evolution-tests/bridge.run.mjs <org> <project> <workItemId>

# H5 — referential integrity: follow work item → child → PR → build → test, check they co-refer
node evolution-tests/referential-bridge.run.mjs <org> <project> <workItemId>

# Just the acquired, materialized input (evidence → canonical → input + provenance)
node connectors/azure-devops/live.run.mjs <org> <project> <workItemId>
```

### What "honest DEFER" looks like on real data

Run live against Taggle's Azure DevOps, H5 returns **DEFER** on a recent PR — *correctly*: the build is
green and even collects coverage, but the pipeline publishes **no test run**, so there is no test
artifact to follow. AVF refuses to equate "green build" with "tested". That DEFER also surfaces a real
process gap (tests run but results aren't published) — a Reality Test discovering a *process* problem,
not just an engine bug. Feed that DEFER to a gate and it BLOCKs a production release (see
[docs/quickstart.md](../../docs/quickstart.md) `simulate`).

Going live changes only the *source of evidence* — the proof pipeline below `fetch` is the same code the
offline demo exercised.
