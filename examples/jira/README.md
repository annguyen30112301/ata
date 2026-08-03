# examples/jira — acquiring evidence from Jira

Runs entirely offline from the locked fixture (`connectors/jira/fixtures/issues.json`) — no Jira
account, no token.

```bash
node examples/jira/demo.mjs
```

It prints, for both Jira and Azure DevOps, the `canonical` each source reduces to and its `sha256`.
Jira's priority arrives as `"High"`, Azure DevOps's as the number `1` — different vocabularies — yet the
two canonicals hash identically, and `jira.materialize === ado.materialize` is the same function object.
The demo asserts nothing; the matching hashes are the proof. That is **Source Substitution**: different
acquisition, same canonical, same pipeline below the adapter.

## Going live (needs Jira credentials)

The connector's live path reads `JIRA_EMAIL` + `JIRA_TOKEN` from the environment (never hard-coded) and
fetches over the shared Integration Kernel. Without them the live path is inert by design. The offline
demo above proves everything except the network hop — going live changes only the *source of evidence*,
never the proof pipeline below the adapter.
