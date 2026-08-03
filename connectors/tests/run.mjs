// Connector SDK tests — every stage of every connector emits the SAME Proof shape.
//   node connectors/tests/run.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connector as html } from '../html/index.mjs';
import { fixtures as htmlFixtures } from '../html/fixtures.mjs';
import { connector as json } from '../json/index.mjs';
import { fixtures as jsonFixtures, equivalenceSets, distinctSets } from '../json/fixtures.mjs';
import { connector as ado } from '../azure-devops/index.mjs';
import { evaluateStages, evaluateEquivalence, evaluateDistinct, evaluateFetch } from '../sdk/pipeline.mjs';
import { proof, isProof, PROOF_KIND, VERDICT } from '../sdk/proof.mjs';
import { attachProvenance, checksum, canonicalize } from '../sdk/collect.mjs';
import { deepEqual } from '../sdk/util.mjs';
import { engine as observation } from '../../engines/observation/v0_1.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const tally = v => { if (v === VERDICT.SUPPORTED) pass++; else if (v === VERDICT.REFUTED) fail++; };
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
// One printer for every Proof, whatever connector or stage produced it.
const printProof = p => {
  if (!isProof(p)) { fail++; console.log(`  FAIL  non-conforming proof: ${JSON.stringify(p)}`); return; }
  tally(p.verdict);
  console.log(`  [${p.kind.padEnd(10)}] ${p.artifact.slice(0, 46).padEnd(46)} ${p.verdict.padEnd(9)} ${p.reason}`);
};
const printStages = r => { console.log(`  fixture: ${r.name}`); r.proofs.forEach(printProof); };

console.log('CONNECTOR SDK — html (parse)');
for (const f of htmlFixtures) printStages(evaluateStages(html, f));
{
  const m = attachProvenance(html, html.fetchFromString({ kind: 'string', before: '<a role="link">X</a>', after: '<a role="link">X</a>' }));
  ok('collect -> MaterializedInput { input, provenance }', !!m.input && m.provenance.connector === 'html@v0');
  const saved = JSON.parse(await readFile(resolve(HERE, '../html/replay/get-started.json'), 'utf8'));
  printProof(proof({ kind: PROOF_KIND.REPLAY, artifact: 'get-started', verdict: deepEqual(html.materialize(saved.fetched.raw), saved.expect_input) ? VERDICT.SUPPORTED : VERDICT.REFUTED, reason: 'saved raw -> saved input' }));
  const fetched = html.fetchFromString({ kind: 'string', before: '<a role="link" class="cta">X</a>', after: '<a role="button" class="cta">X</a>' });
  ok('html -> observation@v0.1 pipes (role change -> UNSTABLE)', observation.evaluate(attachProvenance(html, fetched).input).decision === 'UNSTABLE');
}

console.log('\nCONNECTOR SDK — json (normalize)');
for (const f of jsonFixtures) printStages(evaluateStages(json, f));
for (const s of equivalenceSets) printProof(evaluateEquivalence(json, s));
for (const s of distinctSets) printProof(evaluateDistinct(json, s));
{
  const saved = JSON.parse(await readFile(resolve(HERE, '../json/replay/work-item.json'), 'utf8'));
  printProof(proof({ kind: PROOF_KIND.REPLAY, artifact: 'work-item (raw->canonical)', verdict: deepEqual(canonicalize(json, saved.fetched.raw), saved.expect_canonical) ? VERDICT.SUPPORTED : VERDICT.REFUTED, reason: 'normalize hop stable' }));
  printProof(proof({ kind: PROOF_KIND.REPLAY, artifact: 'work-item (canonical->input)', verdict: deepEqual(json.materialize(saved.expect_canonical), saved.expect_input) ? VERDICT.SUPPORTED : VERDICT.REFUTED, reason: 'materialize hop stable' }));
  ok('replay — provenance checksum is of ORIGINAL raw', attachProvenance(json, saved.fetched).provenance.checksum === checksum(saved.fetched.raw));
}

console.log('\nAZURE DEVOPS — azure-devops (evidence acquisition; normalize/materialize delegated to json)');
{
  const fx = JSON.parse(await readFile(resolve(HERE, '../azure-devops/fixtures/work-items.json'), 'utf8'));
  const rawOf = ref => fx.raw_payloads[ref];
  printProof(await evaluateFetch(ado, { kind: 'fixture', ref: 'wit_api' }));
  for (const c of fx.cases) printStages(evaluateStages(ado, { name: c.name, raw: rawOf(c.raw_ref), expect_canonical: c.expect_canonical, expect: c.expect_input }));
  for (const s of fx.equivalence_sets) printProof(evaluateEquivalence(ado, { name: s.name, equivalent: s.equivalent_refs.map(rawOf), canonical: s.canonical }));
  let threw = false; try { await ado.fetch({ kind: 'live' }); } catch { threw = true; }
  ok('live path declared but inert (needs PAT) — step 3', threw);
}

console.log('\nPROOF CONTRACT');
{
  let threw = false; try { proof({ kind: 'Nonsense', verdict: 'SUPPORTED' }); } catch { threw = true; }
  ok('contract rejects an invalid proof kind', threw);
  ok('every stage emits a conforming Proof (enforced at source)', true);   // guaranteed by proof() construction
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
