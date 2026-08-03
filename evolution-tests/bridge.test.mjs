// EVOLUTION INTEGRATION BRIDGE — the intersection of Integration and Evolution. It proves ONE new
// kind of proof: a RESEARCH benchmark (H4) can consume REAL evidence with NO special pipeline.
//
//   ADO updates (real shape) → toTransition → { from, to } ┐
//   H4 benchmark ─────────────────────────→ lifecycle ─────┴→ transition@v0.1 → VALID / INVALID / DEFER
//
// The engine and the lifecycle are exactly those of the H4 fixture benchmark — nothing bespoke.
//   node evolution-tests/bridge.test.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toTransition } from '../connectors/azure-devops/transitions.mjs';
import { engine as transition } from '../engines/transition/v0_2.mjs';   // mode-aware (restrictive + permissive)
import h4pkg from '../benchmark/h4/load.mjs';
import { deepEqual } from '../connectors/sdk/util.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

const fx = JSON.parse(await readFile(resolve(HERE, '../connectors/azure-devops/fixtures/updates.json'), 'utf8'));
const h4 = await h4pkg.load();
const lifecycle = h4.cases[0].input.lifecycle;                 // benchmark-owned, not from the connector

console.log('EVOLUTION INTEGRATION BRIDGE — real evidence → H4 → verdict');
ok('lifecycle is benchmark-owned (from H4, not the connector)', Array.isArray(lifecycle.allowed) && lifecycle.states.includes('closed'));
ok('engine is the mode-aware H4 engine (transition@v0.2), not a bespoke one', transition.id === 'transition' && transition.version === 'v0.2');

for (const [name, payload] of Object.entries(fx.payloads)) {
  const exp = fx.expected[name];
  const t = toTransition(payload);                             // Integration: real evidence → transition
  ok(`${name}: transition extracted from real ADO updates`, deepEqual(t, exp.transition), JSON.stringify(t));
  const decision = transition.evaluate({ ...t, lifecycle }).decision;   // Evolution: same engine + same lifecycle
  ok(`${name}: closed loop verdict = ${exp.verdict}`, decision === exp.verdict, decision);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
