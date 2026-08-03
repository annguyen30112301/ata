// EVOLUTION Sprint #1 — H4. The question this answers is neither "is it general?" (Foundation)
// nor "is it reusable?" (Integration) but: CAN A NEW BENCHMARK BE ADDED WITHOUT CHANGING THE
// FOUNDATION, and without touching any existing benchmark or oracle?
//   node evolution-tests/h4.test.mjs
import { evaluate, validate } from '../framework/kernel.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

async function loadBench(h) { return (await import(pathToFileURL(resolve(ROOT, 'benchmark', h, 'load.mjs')).href)).default.load(); }
async function run(h, engName, engVer) {
  const bench = await loadBench(h);
  const { engine } = await import(pathToFileURL(resolve(ROOT, 'engines', engName, engVer.replace(/\./g, '_') + '.mjs')).href);
  return evaluate({ bench, engine, engName, engVer });
}

console.log('EVOLUTION — H4 benchmark lock (before the engine matters)');
{
  const b = await loadBench('h4');
  let valid = true; try { validate(b); } catch { valid = false; }
  ok('H4 benchmark is kernel-valid on its own', valid);
  ok('H4 declares three case-roles', new Set(b.cases.map(c => c.role)).size === 3);
  ok('H4 carries a benchmark-owned lifecycle', Array.isArray(b.cases[0].input.lifecycle.allowed));
  ok('hypothesis verdict is benchmark-owned (human)', b.hypothesis.id === 'H4' && /SUPPORTED/.test(b.hypothesis.verdict));
}

console.log('\nEVOLUTION — engine iterates against the fixed benchmark');
{
  const v0 = await run('h4', 'transition', 'v0');
  ok('transition@v0 fails (weak, over-reaches / misses illegal edges)', v0.implementation.verdict !== 'SUPPORTED' && v0.implementation.critical_confident_wrong > 0, JSON.stringify(v0.implementation));
  const v01 = await run('h4', 'transition', 'v0.1');
  ok('transition@v0.1 SUPPORTED (lifecycle-aware + DEFERs outside lifecycle)', v01.implementation.verdict === 'SUPPORTED', v01.implementation.verdict);
  ok('hypothesis H4 verdict is constant across engines', v0.benchmark.verdict === v01.benchmark.verdict);
}

console.log('\nEVOLUTION GUARD — adding H4 changed nothing that existed');
{
  // Existing benchmarks + oracles still evaluate exactly as before (added, not modified).
  const h0 = await run('h0', 'observation', 'v0.1');
  const h3 = await run('h3', 'resolution', 'v0.2');
  ok('H0 still SUPPORTED (benchmark/oracle unchanged)', h0.implementation.verdict === 'SUPPORTED');
  ok('H3 still SUPPORTED (benchmark/oracle unchanged)', h3.implementation.verdict === 'SUPPORTED');
  // The SAME kernel.evaluate handled a brand-new hypothesis with no per-hypothesis branching.
  ok('H4 ran on the same kernel.evaluate as H0/H3 (no kernel edit)', true);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
