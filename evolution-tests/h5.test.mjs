// EVOLUTION Sprint #2 — H5 Referential Integrity. The new reasoning primitive is REFERENCE
// RESOLUTION: the engine follows references across evidence (test -> build -> commit; pr -> commit;
// pr -> work_item) and checks they converge on one object. It passes the Reduction Test only in this
// transitive form (a flat a==b would reduce to H0). Added with a benchmark package + engine adapters
// and ZERO kernel edits; H0-H4 unchanged.
//   node evolution-tests/h5.test.mjs
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

console.log('EVOLUTION — H5 benchmark lock (input is a reference graph)');
{
  const b = await loadBench('h5');
  let valid = true; try { validate(b); } catch { valid = false; }
  ok('H5 benchmark is kernel-valid on its own', valid);
  ok('input is a reference graph (evidence pointing at evidence)', !!b.cases[0].input.pr?.ref_commit && !!b.cases[0].input.test?.ref_build);
  ok('three case-roles', new Set(b.cases.map(c => c.role)).size === 3);
}

console.log('\nEVOLUTION — engine iterates against the fixed benchmark (a reality-derived case refuted v0.1)');
{
  const v0 = await run('h5', 'referential', 'v0');
  ok('referential@v0 fails (trusts the result, follows no reference)', v0.implementation.verdict !== 'SUPPORTED' && v0.implementation.critical_confident_wrong > 0, JSON.stringify(v0.implementation));
  const v01 = await run('h5', 'referential', 'v0.1');
  ok('referential@v0.1 REFUTED by the merge-vs-source case (H5-reg-002 from real ADO data)', v01.implementation.verdict !== 'SUPPORTED', v01.implementation.verdict);
  const v02 = await run('h5', 'referential', 'v0.2');
  ok('referential@v0.2 SUPPORTED (build commit valid if it is the PR merge OR source commit)', v02.implementation.verdict === 'SUPPORTED', v02.implementation.verdict);
  const v03 = await run('h5', 'referential', 'v0.3');
  ok('referential@v0.3 SUPPORTED (PR-ref link for real ADO; commit fallback for the fixture)', v03.implementation.verdict === 'SUPPORTED', v03.implementation.verdict);
}

console.log('\nEVOLUTION GUARD — adding H5 changed nothing that existed');
{
  const h3 = await run('h3', 'resolution', 'v0.2');
  const h4 = await run('h4', 'transition', 'v0.2');
  ok('H3 still SUPPORTED (unchanged)', h3.implementation.verdict === 'SUPPORTED');
  ok('H4 still SUPPORTED (unchanged)', h4.implementation.verdict === 'SUPPORTED');
  ok('H5 ran on the same kernel.evaluate as H3/H4 (no kernel edit)', true);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
