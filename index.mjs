// AVF — the STABLE public API. This barrel is a contract: everything re-exported here is supported and
// will not be removed without a major version bump. Everything NOT here is internal — reachable by a
// deep path (`../rules/engine.mjs`), but free to change. Two tiers, one rule:
//
//   in this barrel      → stable. Removing or changing its signature is a breaking change.
//   deep path elsewhere → internal. May move, rename, or vanish between minor versions.
//
// So the barrel is deliberately SMALL. Adding an export later is cheap (non-breaking); removing one is
// not. When in doubt, leave it internal and promote it here only once a consumer truly needs it.
//
//   Pipeline the surface serves:  Evidence → Benchmark → Engine → Verdict → Ruling → render/gate
//                                                                    └→ (human) → Decision

// Runner — evaluate one engine against one benchmark (writes reports/<h>_<eng>_<ver>.{json,txt}).
export { run } from './framework/run.mjs';

// Report Engine — build the one normalized Report, adapt raw verdicts into it, render it.
export { makeReport } from './report/model.mjs';
export { fromKernelVerdict, fromChains } from './report/adapters.mjs';
export { toMarkdown } from './report/markdown.mjs';
export { toPrComment } from './report/pr-comment.mjs';
export { toJson } from './report/json.mjs';
export { toSarif } from './report/sarif.mjs';
export { toTeamsCard } from './report/teams.mjs';

// Rule Engine — a Report + a policy → a Ruling (the MACHINE's gating action) + a CI exit code. Pure.
export { evaluateRules, exitCodeFor, ACTION } from './rules/engine.mjs';

// Oracle Runtime — record a HUMAN's Decision (confirm/override) over a verdict.
export { submitReview } from './oracle/review.mjs';
export { DECISION } from './oracle/contract.mjs';

// Dashboard — scan repo state and (re)write the self-contained HTML view.
export { buildDashboard } from './dashboard/build.mjs';

// Analytics — write the read-only evidence projection to disk as analytics/analytics.json.
export { buildAnalytics } from './analytics/build.mjs';

// Intentionally NOT exported (internal — import by deep path if you really need them, at your own risk):
//   report/model.mjs   classify · overallVerdict · GATE   (renderer internals)
//   rules/engine.mjs   makeRuling · SEVERITY              (Ruling constructor + label map)
//   oracle/review.mjs  validateReview · suggestLearning   (submitReview's guts + learning router)
//   framework/kernel.mjs  evaluate · FRAMEWORK_VERSION     (the kernel; run() is the entry)
