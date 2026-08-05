// The Analytics Test (Slice 1) — fixtures with HAND-COUNTED figures; the snapshot must match, and it
// must be deterministic. Analytics is "done" when the numbers are provably correct, not when a chart
// looks finished. No disk, no reports/ dependency — pure model over fixtures.
//   node analytics/snapshot.test.mjs
import { overview, benchmarkMetrics, reviewMetrics, ruleMetrics, analyticsSnapshot } from './model.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- fixtures: 3 reports (H4 supported; H5 weak engine INVALID + strong engine SUPPORTED), 3 reviews ---
const reports = [
  { benchmark: { hypothesis: 'H4', verdict: 'SUPPORTED (constructive)' }, implementation: { engine: 'transition@v0.1', verdict: 'SUPPORTED', critical_confident_wrong: 0 }, counts: { regression: 6, preserved: 6, guard: 1, held: 1, refutation: 2, survived: 2 } },
  { benchmark: { hypothesis: 'H5', verdict: 'SUPPORTED (constructive)' }, implementation: { engine: 'referential@v0', verdict: 'INVALID', critical_confident_wrong: 1 }, counts: { regression: 2, preserved: 1, guard: 1, held: 0, refutation: 2, survived: 1 } },
  { benchmark: { hypothesis: 'H5', verdict: 'SUPPORTED (constructive)' }, implementation: { engine: 'referential@v0.3', verdict: 'SUPPORTED', critical_confident_wrong: 0 }, counts: { regression: 2, preserved: 2, guard: 1, held: 1, refutation: 2, survived: 2 } },
];
const reviews = [
  { subject: { hypothesis: 'H5' }, decision: 'confirm', verdict: 'DEFER' },
  { subject: { hypothesis: 'H5' }, decision: 'override', verdict: 'INVALID' },
  { subject: { hypothesis: 'H4' }, decision: 'confirm', verdict: 'VALID' },
];

console.log('ANALYTICS — Overview');
{
  const o = overview(reports, reviews);
  ok('reports=3, reviews=3, hypotheses=2 (H4,H5), engines=3', eq(o, { reports: 3, reviews: 3, hypotheses: 2, engines: 3 }), JSON.stringify(o));
}

console.log('\nANALYTICS — BenchmarkMetrics (two layers kept distinct)');
{
  const b = benchmarkMetrics(reports);
  ok('by_hypothesis = benchmark-owned verdict per hypothesis', eq(b.by_hypothesis, { H4: 'SUPPORTED (constructive)', H5: 'SUPPORTED (constructive)' }), JSON.stringify(b.by_hypothesis));
  // canonical (sorted) key order — the maps are emitted independent of encounter order (D.4a).
  ok('verdict_distribution over IMPLEMENTATION verdicts: SUPPORTED=2, INVALID=1 (canonical key order)', eq(b.verdict_distribution, { INVALID: 1, SUPPORTED: 2 }), JSON.stringify(b.verdict_distribution));
  ok('engine_distribution: one report each (canonical key order)', eq(b.engine_distribution, { 'referential@v0': 1, 'referential@v0.3': 1, 'transition@v0.1': 1 }), JSON.stringify(b.engine_distribution));
  ok('case_totals summed across reports (+ critical_confident_wrong=1)',
    eq(b.case_totals, { regression: 10, preserved: 9, guard: 3, held: 2, refutation: 6, survived: 5, critical_confident_wrong: 1 }), JSON.stringify(b.case_totals));
}

console.log('\nANALYTICS — ReviewMetrics (human oversight)');
{
  const r = reviewMetrics(reviews);
  ok('total=3, confirm=2, override=1', r.total === 3 && r.confirm === 2 && r.override === 1);
  ok('rates: confirm=2/3, override=1/3', Math.abs(r.confirm_rate - 2 / 3) < 1e-9 && Math.abs(r.override_rate - 1 / 3) < 1e-9, `${r.confirm_rate}/${r.override_rate}`);
  ok('by_hypothesis: H5 {1,1}, H4 {1,0} (canonical key order)', eq(r.by_hypothesis, { H4: { confirm: 1, override: 0 }, H5: { confirm: 1, override: 1 } }), JSON.stringify(r.by_hypothesis));
  const empty = reviewMetrics([]);
  ok('empty reviews → zero rates, no divide-by-zero', empty.total === 0 && empty.confirm_rate === 0 && empty.override_rate === 0);
}

console.log('\nANALYTICS — RuleMetrics (derived: re-evaluate policy over reports)');
{
  const rules = [
    { name: 'block bad', when: { verdict_in: ['INVALID', 'MISMATCH', 'REFUTED', 'NOT_READY'] }, then: 'block' },
    { name: 'warn defer', when: { verdict: 'DEFER' }, then: 'warn' },
  ];
  // report verdicts are SUPPORTED / INVALID / SUPPORTED → the INVALID blocks (via 'block bad'), rest allow.
  const rm = ruleMetrics(reports, rules, { env: 'production' });
  ok('evaluated every report', rm.evaluated === 3);
  ok('action_distribution: block=1, warn=0, allow=2', eq(rm.action_distribution, { block: 1, warn: 0, allow: 2 }), JSON.stringify(rm.action_distribution));
  ok('would_block = 1', rm.would_block === 1);
  ok('by_rule: only "block bad" fired, once', eq(rm.by_rule, { 'block bad': 1 }), JSON.stringify(rm.by_rule));
  ok('context recorded on the result (auditable)', eq(rm.context, { env: 'production' }));
  ok('rule appears in snapshot ONLY when a policy is supplied',
    analyticsSnapshot(reports, reviews, { rules, generated_at: 'X' }).rule !== undefined &&
    analyticsSnapshot(reports, reviews, { generated_at: 'X' }).rule === undefined);
}

console.log('\nANALYTICS — snapshot assembly + invariants');
{
  const snap = analyticsSnapshot(reports, reviews, { generated_at: 'FIXED' });
  ok('snapshot carries the four sections', !!snap.generated_at && !!snap.overview && !!snap.benchmark && !!snap.review);
  ok('no rule/trend field in Slice 1 (contract)', snap.rule === undefined && snap.trend === undefined);

  // Determinism: identical evidence → identical snapshot (save for generated_at, pinned equal here).
  const again = analyticsSnapshot(reports, reviews, { generated_at: 'FIXED' });
  ok('deterministic: same evidence → same snapshot', eq(snap, again));

  // Purity: the model must not mutate its inputs.
  const before = JSON.stringify({ reports, reviews });
  analyticsSnapshot(reports, reviews);
  ok('pure: inputs are not mutated', JSON.stringify({ reports, reviews }) === before);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
