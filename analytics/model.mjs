// Evidence Analytics — the model (Slice 1). A READ-ONLY PROJECTION over evidence AVF already emits.
// It stores nothing and mints nothing; see docs/evidence-analytics.md for the contract.
//
// Each metric family is a PURE function of its inputs, so identical evidence → identical numbers
// (the determinism invariant). Disk I/O lives only in loadEvidence/buildSnapshot at the bottom.
//   reports[]  = kernel verdicts  { benchmark{hypothesis,verdict}, implementation{engine,verdict,critical_confident_wrong}, counts{...} }
//   reviews[]  = oracle reviews   { subject{hypothesis}, decision:'confirm'|'override', verdict }
import { fromKernelVerdict } from '../report/adapters.mjs';
import { evaluateRules } from '../rules/engine.mjs';

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

// AnalyticsSnapshot — the DTO. Pure over (reports, reviews): identical evidence yields an identical
// snapshot save for `generated_at`. It holds numbers only — no logic, and no knowledge of any renderer.
// `rule` appears ONLY when a policy is supplied (it is derived, not part of the base Slice-1 shape).
export function analyticsSnapshot(reports, reviews, { rules, context = {}, generated_at = new Date().toISOString() } = {}) {
  const snap = {
    generated_at,
    overview: overview(reports, reviews),
    benchmark: benchmarkMetrics(reports),
    review: reviewMetrics(reviews),
  };
  if (rules) snap.rule = ruleMetrics(reports, rules, context);
  return snap;
}

// ---- I/O boundary: read the existing artifacts, then hand them to the pure model above. ----
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// Default disk snapshot: read evidence + the default gating policy, evaluate RuleMetrics under a chosen
// context (production = the strictest gate). Missing policy → no rule metrics (never fails for its lack).
export async function buildSnapshot(root = ROOT, { context = { env: 'production' } } = {}) {
  const { reports, reviews } = await loadEvidence(root);
  let rules;
  try { rules = JSON.parse(await readFile(resolve(root, 'rules', 'default.json'), 'utf8')).rules; } catch { /* no policy on disk */ }
  return analyticsSnapshot(reports, reviews, { rules, context });
}
