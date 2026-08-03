// GOLDEN KERNEL TESTS — the benchmark of the framework itself.
//
// Project Horizon's law: a benchmark must not change to accommodate an engine.
// AVF's law: the KERNEL must not change to accommodate a connector or a hypothesis.
// These tests are how we hold the kernel to that. If a future connector/engine forces
// an edit to kernel.mjs, one of these should go red first — that is the signal the
// kernel was not general enough, not that the connector was special.
//
// Run:  node kernel-tests/golden.mjs      (exit 0 = all green, 1 = a law broke)
import { evaluate } from '../framework/kernel.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { (cond ? pass++ : fail++); console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + detail}`); };

// A minimal fake benchmark + fake engine, built inline — no fs, no yaml, no real package.
const fakeBench = (id, cases) => ({ schema_version: 1, hypothesis: { id, name: `fake ${id}`, verdict: 'SUPPORTED (fake)' }, cases });
const fakeEngine = (decisionFn) => ({ id: 'fake', version: 'v0', kind: 'fake', capabilities: ['fake'], evaluate: input => ({ decision: decisionFn(input), version: 'v0' }) });

console.log('GOLDEN KERNEL TESTS');

// ── Test 1 ── a correct engine on a well-formed benchmark must reach SUPPORTED.
{
  const bench = fakeBench('HX', [
    { id: 'r1', role: 'regression', oracle: 'KEEP', input: { x: 1 } },
    { id: 'f1', role: 'refutation', oracle: 'CATCH', criticality: 'critical', input: { x: 2 } },
    { id: 'g1', role: 'guard', oracle: 'DEFER', criticality: 'critical', input: { x: 3 } },
  ]);
  const engine = fakeEngine(({ x }) => (x === 1 ? 'KEEP' : x === 2 ? 'CATCH' : 'DEFER'));
  const v = evaluate({ bench, engine, engName: 'fake', engVer: 'v0' });
  ok('Test 1 — correct engine -> SUPPORTED', v.implementation.verdict === 'SUPPORTED', v.implementation.verdict);
}

// ── Test 2 ── an engine that THROWS must not crash the kernel; it is a failed engine,
//             recorded as decision=ERROR and tiered to REFUTED (here, on a refutation case).
{
  const bench = fakeBench('HX', [
    { id: 'f1', role: 'refutation', oracle: 'CATCH', criticality: 'critical', input: { x: 2 } },
  ]);
  const engine = fakeEngine(() => { throw new Error('engine blew up'); });
  let v, threw = false;
  try { v = evaluate({ bench, engine, engName: 'boom', engVer: 'v0' }); } catch { threw = true; }
  ok('Test 2 — throwing engine does not crash kernel', !threw);
  ok('Test 2 — throwing engine -> implementation REFUTED', !threw && v.implementation.verdict === 'REFUTED', v && v.implementation.verdict);
  ok('Test 2 — throw recorded as decision=ERROR', !threw && v.cases[0].decision === 'ERROR', v && v.cases[0].decision);
}

// ── Test 3 ── a brand-new hypothesis id ('H9') runs with NO edit to kernel.mjs/run.mjs.
//             The kernel must not branch on the hypothesis identity.
{
  const bench = fakeBench('H9', [
    { id: 'h9r1', role: 'regression', oracle: 'A', input: {} },
    { id: 'h9f1', role: 'refutation', oracle: 'B', input: {} },
  ]);
  const engine = fakeEngine(() => 'A');            // gets regression right, misses refutation
  const v = evaluate({ bench, engine, engName: 'fake', engVer: 'v0' });
  ok('Test 3 — unknown hypothesis H9 still evaluates', v.benchmark.hypothesis === 'H9', v.benchmark.hypothesis);
  ok('Test 3 — H9 tiers a verdict (REFUTED here)', v.implementation.verdict === 'REFUTED', v.implementation.verdict);
}

// ── Test 4 (schema guard) ── a benchmark the kernel cannot read is rejected, not run blindly.
{
  const bad = { schema_version: 999, hypothesis: { id: 'HX', verdict: 'x' }, cases: [] };
  let threw = false;
  try { evaluate({ bench: bad, engine: fakeEngine(() => 'x'), engName: 'fake', engVer: 'v0' }); } catch { threw = true; }
  ok('Test 4 — unreadable schema_version is rejected', threw);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
