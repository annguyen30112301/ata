// The Analytics Properties Test — Phase D.4b, following docs/validation-pattern.md: LAW → minimal synthetic →
// property → counter-example. This file grows one metric at a time; a metric is a concept of its own, not just
// "part of Analytics". D.4b.1 (here): trendMetrics — a metric family, so its laws are ALGEBRA (a pure function
// of the run log). D.4b.2 will add analyticsSnapshot (the DTO assembler) below.
//   node analytics/properties.test.mjs
import { trendMetrics, analyticsSnapshot, overview, benchmarkMetrics, reviewMetrics, ruleMetrics } from './model.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const perms = xs => [xs, [...xs].reverse(), [...xs.slice(1), xs[0]]];   // a few fixed permutations (deterministic)

// Minimal synthetic run log: two hypotheses, enough for a direction + a flip + metadata, distinct timestamps.
// The moving parts of an entry are (verdict, ccw); the timestamp orders the series.
const E = (h, eng, v, cw, t) => ({ run_id: `r${t}`, timestamp: `2026-08-04T00:0${t}:00.000Z`, hypothesis: h, engine: eng, benchmark_verdict: 'SUPPORTED (constructive)', implementation_verdict: v, critical_confident_wrong: cw, counts: {} });
const log = [E('H4', 'transition@v0.1', 'INVALID', 2, 1), E('H4', 'transition@v0.1', 'SUPPORTED', 0, 2), E('H5', 'referential@v0.3', 'SUPPORTED', 0, 3), E('H5', 'referential@v0.3', 'INVALID', 1, 4)];

try {
  console.log('ANALYTICS PROPERTIES — trendMetrics (a metric family; algebra laws over the run log)');

  // Permutation-invariance — trendMetrics orders the log on timestamp, so the RESULT does not depend on the
  // order entries are supplied in: a metric is a function of the evidence, not of how it was listed.
  ok('permutation-invariant: every ordering of a distinct-timestamp log yields the same trend', perms(log).every(p => eq(trendMetrics(p), trendMetrics(log))));

  // Determinism — the log → metric mini-system: the same log yields the same trend, twice.
  ok('deterministic: same run log → same trend', eq(trendMetrics(log), trendMetrics(log)));

  // Purity — trendMetrics does not mutate the entries it reads.
  ok('pure: the run log is not mutated', (() => { const c = JSON.stringify(log); trendMetrics(log); return JSON.stringify(log) === c; })());

  // Counter-example — the BOUNDARY of permutation-invariance. Ordering is on timestamp; a TIE (two entries in
  // one series sharing a timestamp) resolves by input order, so permuting a tie changes the direction. This is
  // not a defect: for a real append-only log, input order IS the append order — the correct tiebreaker for two
  // runs in the same instant. So the law holds for distinct timestamps, and stops exactly at a tie.
  const tie = [E('H4', 'a@v1', 'INVALID', 0, 1), E('H4', 'a@v1', 'SUPPORTED', 0, 1)];   // both at …:01:00.000Z
  ok('boundary: at a timestamp tie, order matters — invariance holds only for distinct timestamps', !eq(trendMetrics(tie), trendMetrics([...tie].reverse())));

  console.log('\nANALYTICS PROPERTIES — analyticsSnapshot (a DTO ASSEMBLER; its law is that it invents nothing)');
  // Minimal synthetic evidence: two reports, two reviews, a one-rule policy, and the run log above.
  const reports = [
    { benchmark: { hypothesis: 'H4', verdict: 'SUPPORTED (constructive)' }, implementation: { engine: 'a@v1', verdict: 'SUPPORTED', critical_confident_wrong: 0 }, counts: { regression: 1, preserved: 1, guard: 0, held: 0, refutation: 0, survived: 1 } },
    { benchmark: { hypothesis: 'H5', verdict: 'SUPPORTED (constructive)' }, implementation: { engine: 'b@v0', verdict: 'INVALID', critical_confident_wrong: 1 }, counts: { regression: 2, preserved: 0, guard: 1, held: 0, refutation: 1, survived: 0 } },
  ];
  const reviews = [{ subject: { hypothesis: 'H5' }, decision: 'confirm', verdict: 'DEFER' }, { subject: { hypothesis: 'H4' }, decision: 'override', verdict: 'INVALID' }];
  const rules = [{ name: 'block bad', when: { verdict_in: ['INVALID'] }, then: 'block' }];
  const context = { env: 'production' };
  const opts = { rules, context, runLog: log, generated_at: 'X' };
  const strip = ({ generated_at, ...r }) => r;   // generated_at is a clock, not evidence

  // Algebra — the laws every pure projection has. Permutation-invariance is the one D.4a made true.
  {
    ok('permutation-invariant: reordering reports/reviews yields an identical snapshot (D.4a)', eq(strip(analyticsSnapshot(reports, reviews, opts)), strip(analyticsSnapshot([...reports].reverse(), [...reviews].reverse(), opts))));
    ok('deterministic: same evidence → same snapshot', eq(strip(analyticsSnapshot(reports, reviews, opts)), strip(analyticsSnapshot(reports, reviews, opts))));
    ok('pure: the evidence is not mutated', (() => { const c = JSON.stringify({ reports, reviews, log }); analyticsSnapshot(reports, reviews, opts); return JSON.stringify({ reports, reviews, log }) === c; })());
  }

  // System — the assembler's OWN law: the snapshot is exactly its metric families assembled, nothing more. Each
  // section equals the family function called directly; the assembler adds only assembly (+ the generated_at
  // stamp). This is what "Owns the DTO, consumes only metric families, invents no meaning" means as a test.
  {
    const snap = analyticsSnapshot(reports, reviews, opts);
    ok('assembler = its families: overview === overview()', eq(snap.overview, overview(reports, reviews)));
    ok('assembler = its families: benchmark === benchmarkMetrics()', eq(snap.benchmark, benchmarkMetrics(reports)));
    ok('assembler = its families: review === reviewMetrics()', eq(snap.review, reviewMetrics(reviews)));
    ok('assembler = its families: rule === ruleMetrics()', eq(snap.rule, ruleMetrics(reports, rules, context)));
    ok('assembler = its families: trend === trendMetrics()', eq(snap.trend, trendMetrics(log)));
  }

  // Boundary — the assembler never invents a family: a derived family appears ONLY when its input is supplied.
  {
    const bare = analyticsSnapshot(reports, reviews, { generated_at: 'X' });   // no policy, no run log
    ok('boundary: no policy → no rule family; no run log → no trend family (invents nothing)', bare.rule === undefined && bare.trend === undefined);
    ok('boundary: supply the input → the family appears', analyticsSnapshot(reports, reviews, { rules, context, generated_at: 'X' }).rule !== undefined && analyticsSnapshot(reports, reviews, { runLog: log, generated_at: 'X' }).trend !== undefined);
  }
} finally { /* pure — nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
