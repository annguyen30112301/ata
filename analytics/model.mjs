// Evidence Analytics — the model (Slice 1). A READ-ONLY PROJECTION over evidence AVF already emits.
// It stores nothing and mints nothing; see docs/evidence-analytics.md for the contract.
//
// Each metric family is a PURE function of its inputs, so identical evidence → identical numbers
// (the determinism invariant). Disk I/O lives only in loadEvidence/buildSnapshot at the bottom.
//   reports[]  = kernel verdicts  { benchmark{hypothesis,verdict}, implementation{engine,verdict,critical_confident_wrong}, counts{...} }
//   reviews[]  = oracle reviews   { subject{hypothesis}, decision:'confirm'|'override', verdict }
import { fromKernelVerdict } from '../report/adapters.mjs';
import { evaluateRules } from '../rules/engine.mjs';
import { VERDICT_DIRECTION, CCW_DIRECTION } from './directions.mjs';

const inc = (obj, key) => { obj[key] = (obj[key] || 0) + 1; return obj; };

// Overview — how much evidence exists, and how much of the map it covers.
export function overview(reports, reviews) {
  return {
    reports: reports.length,
    reviews: reviews.length,
    hypotheses: new Set(reports.map(r => r.benchmark.hypothesis)).size,
    engines: new Set(reports.map(r => r.implementation.engine)).size,
  };
}

// BenchmarkMetrics — the two layers kept distinct: the hypothesis verdict is benchmark-owned (one per
// hypothesis), while the verdict distribution is over IMPLEMENTATION verdicts (per engine run).
export function benchmarkMetrics(reports) {
  const by_hypothesis = {};
  const verdict_distribution = {};
  const engine_distribution = {};
  const case_totals = { regression: 0, preserved: 0, guard: 0, held: 0, refutation: 0, survived: 0, critical_confident_wrong: 0 };
  for (const r of reports) {
    by_hypothesis[r.benchmark.hypothesis] = r.benchmark.verdict;        // benchmark-owned, constant per hypothesis
    inc(verdict_distribution, r.implementation.verdict);               // implementation layer
    inc(engine_distribution, r.implementation.engine);
    for (const k of ['regression', 'preserved', 'guard', 'held', 'refutation', 'survived']) case_totals[k] += r.counts?.[k] || 0;
    case_totals.critical_confident_wrong += r.implementation?.critical_confident_wrong || 0;
  }
  return { by_hypothesis, verdict_distribution, engine_distribution, case_totals };
}

// ReviewMetrics — human oversight: how often a human confirms vs. overrides a machine verdict.
export function reviewMetrics(reviews) {
  const total = reviews.length;
  const by_hypothesis = {};
  let confirm = 0, override = 0;
  for (const rv of reviews) {
    const h = rv.subject?.hypothesis || '?';
    by_hypothesis[h] = by_hypothesis[h] || { confirm: 0, override: 0 };
    if (rv.decision === 'confirm') { confirm++; by_hypothesis[h].confirm++; }
    else if (rv.decision === 'override') { override++; by_hypothesis[h].override++; }
  }
  const rate = n => (total ? n / total : 0);
  return { total, confirm, override, confirm_rate: rate(confirm), override_rate: rate(override), by_hypothesis };
}

// RuleMetrics — DERIVED, not stored: re-evaluate a gating policy over the stored reports and aggregate
// what would happen. A Ruling is context-dependent, so both `rules` and `context` are inputs, and both are
// recorded on the result so the numbers are auditable ("under production, this policy would block N").
export function ruleMetrics(reports, rules, context = {}) {
  const action_distribution = { block: 0, warn: 0, allow: 0 };
  const by_rule = {};
  for (const raw of reports) {
    const ruling = evaluateRules(fromKernelVerdict(raw), rules, context);
    inc(action_distribution, ruling.action);
    for (const m of ruling.matched) inc(by_rule, m.rule);
  }
  return { evaluated: reports.length, context, action_distribution, would_block: action_distribution.block, by_rule };
}

// TrendMetrics — the only history-over-time family (docs/trend-metrics.contract.md). It reads the append-only
// run log and returns the DIRECTION of implementation behavior, NEVER the raw history: run log stores events,
// TrendMetrics derives transitions, the snapshot presents direction. Each metric takes the observation unit
// its meaning needs — verdict/ccw trajectory per HYPOTHESIS (the evolution story), verdict flip per
// (hypothesis, engine@version) (a fixed specimen changing = the ground moved). It is a Local Machine Trend:
// it describes the current run log, not the project's evolution. Pure over its entries.
const SUPPORTED = 'SUPPORTED';

// CLOSED enums — the direction vocabularies now live in the leaf ./directions.mjs (no imports, no I/O): imported
// above for use below, and RE-EXPORTED here so existing `from './model.mjs'` importers are unchanged. A consumer
// that needs only the vocabulary (Decision reading `direction`) imports the leaf and never pulls in this model.
export { VERDICT_DIRECTION, CCW_DIRECTION };

// Group entries into ordered series (oldest first) by a key. Timestamp sort; a fixed-specimen series is
// normally flat (kernel determinism), so any movement in it is a signal, not noise.
function orderedSeries(entries, keyOf) {
  const ordered = [...entries].sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
  const m = new Map();
  for (const e of ordered) { const k = keyOf(e); if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
  return m;
}

export function trendMetrics(entries) {
  const usable = entries.filter(e => e && e.hypothesis && e.implementation_verdict);
  if (!usable.length) return { status: 'no history yet' };
  const V = VERDICT_DIRECTION, C = CCW_DIRECTION;

  // Direction + confidence quality — per hypothesis. The metric fields are direction + endpoints ONLY; the
  // run count is context (how many observations back the direction), so it lives under `metadata`, never as a
  // peer of the metric — that keeps a "runs: 42" from ever being read as a headline (metric ≠ inventory).
  const hypotheses = {};
  for (const [hyp, series] of orderedSeries(usable, e => e.hypothesis)) {
    const first = series[0], last = series[series.length - 1];
    const thin = series.length < 2;
    const toSup = last.implementation_verdict === SUPPORTED, fromSup = first.implementation_verdict === SUPPORTED;
    const verdictDir = thin ? V.INSUFFICIENT : toSup === fromSup ? V.UNCHANGED : toSup ? V.TOWARD : V.AWAY;
    const cf = first.critical_confident_wrong, cl = last.critical_confident_wrong;
    const ccwDir = thin ? C.INSUFFICIENT : cl < cf ? C.FALLING : cl > cf ? C.RISING : C.FLAT;
    hypotheses[hyp] = {
      verdict: { from: first.implementation_verdict, to: last.implementation_verdict, direction: verdictDir },
      ccw: { from: cf, to: cl, direction: ccwDir },
      metadata: { observations: series.length },
    };
  }

  // Stability — verdict flip per (hypothesis, engine@version): did a FIXED specimen change behavior? A series
  // of one run cannot flip, so it is not reported. This is the metric's definition, not an alternate grouping.
  const stability = {};
  for (const [key, series] of orderedSeries(usable, e => `${e.hypothesis} · ${e.engine}`)) {
    if (series.length < 2) continue;
    let flips = 0;
    for (let i = 1; i < series.length; i++) if (series[i].implementation_verdict !== series[i - 1].implementation_verdict) flips++;
    stability[key] = { flips, metadata: { observations: series.length } };
  }

  return { hypotheses, stability };
}

// AnalyticsSnapshot — the DTO. Pure over (reports, reviews): identical evidence yields an identical
// snapshot save for `generated_at`. It holds numbers only — no logic, and no knowledge of any renderer.
// `rule` appears ONLY when a policy is supplied (it is derived, not part of the base Slice-1 shape).
export function analyticsSnapshot(reports, reviews, { rules, context = {}, runLog, generated_at = new Date().toISOString() } = {}) {
  // CANONICAL key order — generated_at, overview, benchmark, review, rule, trend. A new metric family
  // APPENDS after the existing ones (never inserts between) so the serialized artifact's diffs stay stable.
  const snap = {
    generated_at,
    overview: overview(reports, reviews),
    benchmark: benchmarkMetrics(reports),
    review: reviewMetrics(reviews),
  };
  if (rules) snap.rule = ruleMetrics(reports, rules, context);   // derived, conditional — appears only with a policy
  if (runLog) snap.trend = trendMetrics(runLog);                 // history-over-time — appears only when the run log is consulted
  return snap;
}

// ---- I/O boundary: read the existing artifacts, then hand them to the pure model above. ----
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRunLog } from '../run-log/store.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A report Analytics understands: the current kernel-verdict shape. Older/foreign JSON in reports/ (an
// obsolete flat schema, a hand-written file) is skipped, not crashed on — Analytics reads the evidence it
// recognizes and never fails for the shape of the rest.
const isKernelReport = r => !!(r && r.benchmark?.hypothesis && r.implementation?.engine);

// Read reports/*.json + oracle/reviews.json. Missing/empty sources → empty arrays (a fresh clone has no
// reports/ yet — Analytics simply reports zero, it never fails for lack of evidence).
export async function loadEvidence(root = ROOT) {
  let reports = [];
  try {
    const files = (await readdir(resolve(root, 'reports'))).filter(f => f.endsWith('.json'));
    const parsed = await Promise.all(files.map(async f => JSON.parse(await readFile(resolve(root, 'reports', f), 'utf8'))));
    reports = parsed.filter(isKernelReport);
  } catch { /* no reports directory yet */ }
  let reviews = [];
  try { reviews = JSON.parse(await readFile(resolve(root, 'oracle', 'reviews.json'), 'utf8')); } catch { /* no reviews yet */ }
  return { reports, reviews };
}

// Default disk snapshot: read evidence + a gating policy, evaluate RuleMetrics under a chosen context
// (production = the strictest gate). The policy is INJECTABLE: a caller may pass `rules` directly (an API
// consumer, a test) and no file is read; only when `rules` is omitted do we fall back to the on-disk
// default gate. Pass `rules: null` to opt out entirely. Missing default → no rule metrics (never fails).
export async function buildSnapshot(root = ROOT, { rules, context = { env: 'production' } } = {}) {
  const { reports, reviews } = await loadEvidence(root);
  if (rules === undefined) {
    try { rules = JSON.parse(await readFile(resolve(root, 'rules', 'default.json'), 'utf8')).rules; } catch { /* no policy on disk */ }
  }
  const runLog = await loadRunLog(root);   // machine history; empty on a fresh clone → trend reports "no history yet"
  return analyticsSnapshot(reports, reviews, { rules, context, runLog });
}
