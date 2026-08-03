// POLICY MODES — one engine (transition@v0.2) serves both a restrictive state machine and a
// permissive (ADO-like) policy, because the mode is DECLARED in the Knowledge Package, not coded.
//   node evolution-tests/policy-modes.test.mjs
import { evaluate } from '../framework/kernel.mjs';
import { loadWith } from '../benchmark/h4/load.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

async function run(knowledge, engVer) {
  const bench = await loadWith(knowledge);
  const { engine } = await import(pathToFileURL(resolve(ROOT, 'engines', 'transition', engVer.replace(/\./g, '_') + '.mjs')).href);
  return evaluate({ bench, engine, engName: 'transition', engVer });
}

console.log('POLICY MODES — mode declared in the Knowledge Package, engine only reads it');

// Restrictive (generic): both the restrictive engine (v0.1) and the mode-aware engine (v0.2) pass.
ok('restrictive + v0.1 (restrictive engine) -> SUPPORTED', (await run('generic', 'v0.1')).implementation.verdict === 'SUPPORTED');
ok('restrictive + v0.2 (mode-aware)         -> SUPPORTED', (await run('generic', 'v0.2')).implementation.verdict === 'SUPPORTED');

// Permissive (permissive-demo): needs the mode-aware engine; the restrictive engine cannot do it.
const permV02 = await run('permissive-demo', 'v0.2');
ok('permissive + v0.2 (mode-aware)          -> SUPPORTED', permV02.implementation.verdict === 'SUPPORTED', permV02.implementation.verdict);
const permV01 = await run('permissive-demo', 'v0.1');
ok('permissive + v0.1 (restrictive engine)  -> NOT SUPPORTED (needs v0.2)', permV01.implementation.verdict !== 'SUPPORTED', permV01.implementation.verdict);

// Spot-check the permissive semantics via the generated benchmark cases.
{
  const bench = await loadWith('permissive-demo');
  const has = (from, to, oracle) => bench.cases.some(c => c.input.from === from && c.input.to === to && c.oracle === oracle);
  ok('permissive: forbidden edge committed->done is INVALID', has('committed', 'done', 'INVALID'));
  ok('permissive: non-forbidden observed edge is VALID', bench.cases.some(c => c.role === 'regression' && c.oracle === 'VALID'));
  ok('permissive: out-of-lifecycle target is DEFER (missing-state)', bench.cases.some(c => c.oracle === 'DEFER' && c.knowledge === 'missing-state'));
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
