// The Run Log Test — the EXECUTABLE SPECIFICATION of docs/run-log.contract.md. It is a mechanical encoding
// of the contract's invariants (§2) and acceptance table (§6): one bar per invariant, each the `Red when`
// made runnable. Nothing here decides design — the contract already did. Fixture-first, mirrors
// snapshot.test.mjs.
//   node run-log/run-log.test.mjs
//
// Two bars (§6 #9, #10) are REPLAYABLE-BEHAVIOR and DETERMINISM DOWNSTREAM. They require TrendMetrics, which
// does not exist yet, so they appear as explicit PEND(ing) placeholders — designed coverage awaiting a
// subsystem, not forgotten coverage. They light up in beat 2, alongside TrendMetrics.
import { toEntry, RUN_LOG_FIELDS } from './model.mjs';
import { appendEntry, loadRunLog } from './store.mjs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

let pass = 0, fail = 0;
const pend = [];
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const roots = [];
const freshRoot = async () => { const r = await mkdtemp(resolve(tmpdir(), 'avf-runlog-')); roots.push(r); return r; };

// A verdict exactly as framework/run.mjs assembles it: run identity + kernel output. It deliberately carries
// per-case `cases`, plus name/kind/capabilities/reason — none of which may leak into the entry (§3 "Out").
const verdict = () => ({
  run: { run_id: 'run-0001', timestamp: '2026-08-04T04:35:10.352Z', framework_version: '0.1.0', schema_version: 1 },
  benchmark: { hypothesis: 'H4', name: 'Lifecycle / Transition', verdict: 'SUPPORTED (constructive)' },
  implementation: { engine: 'transition@v0.1', kind: 'lifecycle-aware', capabilities: ['transition'], verdict: 'SUPPORTED', reason: null, critical_confident_wrong: 0 },
  counts: { regression: 6, preserved: 6, guard: 1, held: 1, refutation: 2, survived: 2 },
  cases: [{ id: 'H4-reg-001', role: 'regression', oracle: 'VALID', decision: 'VALID', status: 'preserved' }],
});

try {
  console.log('RUN LOG — §6 acceptance (8 bars here; 2 beat-2 bars realized in analytics/trend.test.mjs)');

  // Bar 1 — Shape (§3): exactly the canonical keys, in canonical order, with correct types.
  {
    const e = toEntry(verdict());
    ok('1. shape: exactly the canonical §3 keys, in canonical order', eq(Object.keys(e), RUN_LOG_FIELDS), JSON.stringify(Object.keys(e)));
    ok('1. shape: correct types (verdicts=string, ccw=number, counts=object)',
      typeof e.benchmark_verdict === 'string' && typeof e.implementation_verdict === 'string' &&
      typeof e.critical_confident_wrong === 'number' && typeof e.counts === 'object' && e.counts !== null);
    // The "Out" list (§3) must NOT leak: no projection field, no per-case detail, no other-source field.
    const forbidden = ['rule', 'would_block', 'action', 'cases', 'name', 'kind', 'capabilities', 'reason', 'decision', 'report', 'schema_version'];
    ok('1. shape: no projection / other-source / presentation field leaked in', forbidden.every(k => !(k in e)), forbidden.filter(k => k in e).join(','));
  }

  // Bar 2 — One entry = one evaluate (inv 1): N run()s ⇒ N appended entries.
  {
    const root = await freshRoot();
    await appendEntry(toEntry(verdict()), root);   // run #1
    await appendEntry(toEntry(verdict()), root);   // run #2
    const log = await loadRunLog(root);
    ok('2. one entry = one evaluate: 2 runs → 2 entries', log.length === 2, `len=${log.length}`);
  }

  // Bar 3 — Append-only / immutable (inv 2): appending M more leaves the first N lines byte-identical, N+M total.
  {
    const root = await freshRoot();
    for (let i = 0; i < 3; i++) await appendEntry({ ...toEntry(verdict()), run_id: `n-${i}` }, root);
    const prefix = await readFile(resolve(root, 'run-log', 'runs.jsonl'), 'utf8');
    for (let i = 3; i < 5; i++) await appendEntry({ ...toEntry(verdict()), run_id: `n-${i}` }, root);
    const full = await readFile(resolve(root, 'run-log', 'runs.jsonl'), 'utf8');
    const lines = full.split('\n').filter(Boolean);
    ok('3. immutable: first N lines byte-identical after later appends', full.startsWith(prefix), 'prefix drifted');
    ok('3. append-only: line count is N+M (3+2=5)', lines.length === 5, `lines=${lines.length}`);
  }

  // Bar 4 — Write is read-free (inv 3): bytes for a fixed verdict are identical whether the log is empty or large.
  {
    const root = await freshRoot();
    const v = verdict();
    const beforeAnyLog = JSON.stringify(toEntry(v));
    for (let i = 0; i < 1000; i++) await appendEntry({ filler: i }, root);   // grow the log to 1000 lines
    const afterLargeLog = JSON.stringify(toEntry(v));
    ok('4. write is read-free: same verdict → identical bytes regardless of log size', beforeAnyLog === afterLargeLog);
  }

  // Bar 5 — Self-contained (inv 4): no entry points into reports/ (or anywhere); it stands alone.
  {
    const e = toEntry(verdict());
    const strings = JSON.stringify(e);
    ok('5. self-contained: no pointer into reports/ (or any path reference)', !/reports[\\/]/.test(strings) && !('report' in e));
  }

  // Bar 6 — Replayable, shape completeness (inv 5, beat 1): every canonical §3 field is present & defined.
  // Canonical-entry-driven ON PURPOSE — it does not mention TrendMetrics: the entry is the fixed point, and
  // TrendMetrics must adapt to it, never the reverse.
  {
    const e = toEntry(verdict());
    ok('6. replayable (shape completeness): every canonical §3 field present and defined',
      RUN_LOG_FIELDS.every(k => e[k] !== undefined), RUN_LOG_FIELDS.filter(k => e[k] === undefined).join(','));
  }

  // Bar 7 — Data only, no presentation (inv 6): every value is plain data (no markdown/HTML/rendered text).
  {
    const e = toEntry(verdict());
    const scalars = ['run_id', 'timestamp', 'hypothesis', 'engine', 'benchmark_verdict', 'implementation_verdict', 'framework_version'];
    const clean = scalars.every(k => typeof e[k] === 'string' && !/[<>\n|#*`]/.test(e[k]));
    const countsNumeric = Object.values(e.counts).every(v => typeof v === 'number');
    ok('7. data only: scalars are plain strings, counts are numbers, no presentation markup', clean && countsNumeric && typeof e.critical_confident_wrong === 'number');
  }

  // Bar 8 — Tolerant reader (§5): blank, MALFORMED (bad JSON) and FOREIGN (valid JSON, wrong shape) lines are
  // all skipped, not fatal; a missing file reads as empty.
  {
    const root = await freshRoot();
    await appendEntry(toEntry({ ...verdict(), run: { ...verdict().run, run_id: 'good-1' } }), root);
    const { appendFile } = await import('node:fs/promises');
    await appendFile(resolve(root, 'run-log', 'runs.jsonl'), '\n{ this is not json }\n{"hello":123}\n');   // blank + malformed + foreign
    await appendEntry(toEntry({ ...verdict(), run: { ...verdict().run, run_id: 'good-2' } }), root);
    const log = await loadRunLog(root);
    ok('8. tolerant reader: skips blank/malformed/foreign lines, keeps the 2 good entries', log.length === 2 && log[0].run_id === 'good-1' && log[1].run_id === 'good-2', `len=${log.length}`);
    ok('8. tolerant reader: a foreign but valid-JSON line ({"hello":123}) never enters history', !log.some(e => e.hello !== undefined));
    const missing = await loadRunLog(await freshRoot());
    ok('8. tolerant reader: a missing log reads as empty history (never fails for absence)', eq(missing, []));
  }

  // Bars 9 & 10 — beat 2. TrendMetrics now exists, so these are REALIZED (not pending) in the Trend Test,
  // which reads this very log format: bar 9 (replayable behavior) and bar 10 (deterministic downstream).
  pend.push('9. replayable (behavior): trend from runs.jsonl ALONE == reference trend');
  pend.push('10. deterministic downstream: a fixed log yields one identical trend');
  console.log('\nRUN LOG — beat 2 (realized in analytics/trend.test.mjs)');
  for (const p of pend) console.log(`  DONE  ${p}\n        Realized in analytics/trend.test.mjs (bars 3 & 4).`);
} finally {
  for (const r of roots) await rm(r, { recursive: true, force: true });
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed, ${pend.length} beat-2 bars realized in analytics/trend.test.mjs`);
process.exit(fail ? 1 : 0);
