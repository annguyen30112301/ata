// The Trend Test — the executable spec of docs/trend-metrics.contract.md §6, fixture-first (mirrors
// snapshot.test.mjs). It also turns GREEN the two beat-2 bars the run-log contract left pending: replayable
// behavior (a trend builds from runs.jsonl ALONE) and determinism (a fixed log → one trend).
//   node analytics/trend.test.mjs
import { trendMetrics, VERDICT_DIRECTION, CCW_DIRECTION } from './model.mjs';
import { appendEntry, loadRunLog } from '../run-log/store.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A run-log entry (canonical shape). `t` orders the series; ccw/verdict are the moving parts.
const E = (hypothesis, engine, implementation_verdict, critical_confident_wrong, t) => ({
  run_id: `r-${t}`, timestamp: `2026-08-04T00:0${t}:00.000Z`, hypothesis, engine,
  benchmark_verdict: 'SUPPORTED (constructive)', implementation_verdict, critical_confident_wrong,
  counts: { regression: 2, preserved: 2, guard: 1, held: 1, refutation: 2, survived: 2 }, framework_version: '0.1.0',
});

// H4: one engine iterating — INVALID→SUPPORTED, ccw 3→2→0 (improving). H5: a fixed specimen that flips.
const fixture = [
  E('H4', 'transition@v0', 'INVALID', 3, 1),
  E('H4', 'transition@v0.1', 'INVALID', 2, 2),
  E('H4', 'transition@v0.1', 'SUPPORTED', 0, 3),
  E('H5', 'referential@v0.3', 'SUPPORTED', 0, 4),
  E('H5', 'referential@v0.3', 'INVALID', 1, 5),
  E('H5', 'referential@v0.3', 'SUPPORTED', 0, 6),   // SUPPORTED→INVALID→SUPPORTED on a fixed specimen = 2 flips
];

try {
  console.log('TREND — §6 acceptance (fixtures with hand-read direction)');

  // Bar 1 — Direction: verdict trajectory + ccw trajectory, per hypothesis. Direction is a CLOSED enum value.
  {
    const t = trendMetrics(fixture);
    ok('1. direction: H4 verdict INVALID→SUPPORTED reads toward_supported (enum-backed)', t.hypotheses.H4.verdict.direction === VERDICT_DIRECTION.TOWARD, JSON.stringify(t.hypotheses.H4.verdict));
    ok('1. confidence quality: H4 ccw 3→0 reads falling (enum-backed)', t.hypotheses.H4.ccw.direction === CCW_DIRECTION.FALLING && t.hypotheses.H4.ccw.from === 3 && t.hypotheses.H4.ccw.to === 0);
    ok('1. direction: H5 endpoints SUPPORTED→SUPPORTED reads unchanged', t.hypotheses.H5.verdict.direction === VERDICT_DIRECTION.UNCHANGED, JSON.stringify(t.hypotheses.H5.verdict));
    // metric ≠ inventory: the run count is context under metadata, NOT a peer of verdict/ccw.
    ok('1. metadata: observations live under metadata, never beside the metric', t.hypotheses.H4.metadata.observations === 3 && !('runs' in t.hypotheses.H4) && !('observations' in t.hypotheses.H4));
  }

  // Bar 2 — Stability: verdict flip, per (hypothesis, engine@version). flips is the metric; count is metadata.
  {
    const t = trendMetrics(fixture);
    ok('2. stability: H5 fixed specimen SUPPORTED→INVALID→SUPPORTED = 2 flips', t.stability['H5 · referential@v0.3'].flips === 2, JSON.stringify(t.stability));
    ok('2. stability: a single-run specimen is not reported (cannot flip)', !('H4 · transition@v0' in t.stability));
    ok('2. stability: observations under metadata, flips is the only metric field', t.stability['H5 · referential@v0.3'].metadata.observations === 3 && !('runs' in t.stability['H5 · referential@v0.3']));
  }

  // Bar 3 — Replayable from the log ALONE (run-log §6 bar 9): build the trend from runs.jsonl, no reports/.
  {
    const root = await mkdtemp(resolve(tmpdir(), 'avf-trend-'));
    try {
      for (const e of fixture) await appendEntry(e, root);       // ONLY a run log exists under this root
      const fromDisk = trendMetrics(await loadRunLog(root));
      ok('3. replayable: trend from runs.jsonl ALONE equals trend from entries (no reports/ needed)', eq(fromDisk, trendMetrics(fixture)));
    } finally { await rm(root, { recursive: true, force: true }); }
  }

  // Bar 4 — Deterministic (run-log §6 bar 10): same log → identical trend, twice.
  ok('4. deterministic: same fixture → identical trend', eq(trendMetrics(fixture), trendMetrics(fixture)));

  // Bar 5 — Empty / thin: no history, and a one-run series has undefined direction (never a crash).
  {
    ok('5. empty log → "no history yet"', eq(trendMetrics([]), { status: 'no history yet' }));
    const thin = trendMetrics([E('H9', 'solo@v0', 'SUPPORTED', 0, 1)]);
    ok('5. single-run series → direction insufficient, no crash, no flip reported',
      thin.hypotheses.H9.verdict.direction === 'insufficient' && thin.hypotheses.H9.ccw.direction === 'insufficient' && eq(thin.stability, {}));
  }

  // Bar 6 — Interpretation, not echo: a flat series reads as a token; trend holds NO verbatim per-run list.
  {
    const flat = trendMetrics([E('H1', 'e@v0', 'SUPPORTED', 0, 1), E('H1', 'e@v0', 'SUPPORTED', 0, 2), E('H1', 'e@v0', 'SUPPORTED', 0, 3)]);
    ok('6. interpretation: flat SUPPORTED×3 → unchanged (a direction token)', flat.hypotheses.H1.verdict.direction === 'unchanged');
    // No field is a raw sequence: the verdict/ccw objects expose only endpoints + a token.
    const shape = eq(Object.keys(flat.hypotheses.H1.verdict).sort(), ['direction', 'from', 'to']) && eq(Object.keys(flat.hypotheses.H1.ccw).sort(), ['direction', 'from', 'to']);
    ok('6. not echo: verdict/ccw carry only {from,to,direction} — no per-run array to diff back into the log', shape, JSON.stringify(flat.hypotheses.H1));
  }
} finally { /* temp roots cleaned inline */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
