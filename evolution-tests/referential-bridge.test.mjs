// REFERENTIAL BRIDGE — H5 on real ADO shapes. Raw payloads (wit/git/build/test) -> reference adapter
// -> the SAME referential engine as the H5 fixture benchmark. Proves the reference-resolution primitive
// survives real evidence topology (the Reality Test), with no bespoke pipeline.
//   node evolution-tests/referential-bridge.test.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toReferenceGraph, prIdFromWorkItem } from '../connectors/azure-devops/references.mjs';
import { engine as referential } from '../engines/referential/v0_3.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

const fx = JSON.parse(await readFile(resolve(HERE, '../connectors/azure-devops/fixtures/reference-chain.json'), 'utf8'));

console.log('REFERENTIAL BRIDGE — real ADO chain -> H5 verdict');
ok('engine is the H5 fixture engine (referential@v0.3)', referential.id === 'referential' && referential.version === 'v0.3');
ok('adapter parses the PR id from a work item ArtifactLink', prIdFromWorkItem(fx.scenarios.consistent.work_item) === '12', prIdFromWorkItem(fx.scenarios.consistent.work_item));

for (const [name, chain] of Object.entries(fx.scenarios)) {
  const graph = toReferenceGraph(chain);                     // ADO vocabulary -> reference graph
  const decision = referential.evaluate(graph).decision;     // reference-resolution primitive (unchanged)
  ok(`${name}: real chain -> ${fx.expected[name]}`, decision === fx.expected[name], decision);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
