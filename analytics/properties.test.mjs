// The Analytics Properties Test — Phase D.4b, following docs/validation-pattern.md: LAW → minimal synthetic →
// property → counter-example. This file grows one metric at a time; a metric is a concept of its own, not just
// "part of Analytics". D.4b.1 (here): trendMetrics — a metric family, so its laws are ALGEBRA (a pure function
// of the run log). D.4b.2 will add analyticsSnapshot (the DTO assembler) below.
//   node analytics/properties.test.mjs
import { trendMetrics } from './model.mjs';

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
} finally { /* pure — nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
