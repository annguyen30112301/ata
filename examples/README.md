# AVF examples

Runnable, offline (no credentials, no network). Start at the top.

| Example | Run | Shows |
|---------|-----|-------|
| [minimal](minimal/) | `node examples/minimal/example.mjs` | the whole loop — benchmark judges engines, verdict → Ruling → render/gate |
| [jira](jira/) | `node examples/jira/demo.mjs` | evidence acquisition + Source Substitution (Jira ↔ Azure DevOps → same canonical) |
| [azure-devops](azure-devops/) | `node examples/azure-devops/demo.mjs` | ADO evidence offline, plus the live bridge commands (H4/H5, needs a PAT) |

New to AVF? Read [docs/quickstart.md](../docs/quickstart.md) first, then run `minimal`.

All three are smoke-tested (`npm run test:examples`) so they cannot silently rot — a broken example is
a failed build, which is the Clone Test enforced in CI.
