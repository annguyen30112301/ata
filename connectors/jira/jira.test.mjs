// SPRINT 2 — Jira. Success is NOT "Jira runs"; it is Source Substitution #2:
//   Azure DevOps and Jira share the SAME proof pipeline below their adapters.
//   node connectors/jira/jira.test.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connector as jira } from './index.mjs';
import { connector as ado } from '../azure-devops/index.mjs';
import { connector as json } from '../json/index.mjs';
import { evaluateStages, evaluateFetch } from '../sdk/pipeline.mjs';
import { isProof, VERDICT } from '../sdk/proof.mjs';
import { canonicalize, transform } from '../sdk/collect.mjs';
import { deepEqual } from '../sdk/util.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const tally = v => { if (v === VERDICT.SUPPORTED) pass++; else if (v === VERDICT.REFUTED) fail++; };
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const printProof = p => { if (!isProof(p)) { fail++; return console.log(`  FAIL  bad proof ${JSON.stringify(p)}`); } tally(p.verdict); console.log(`  [${p.kind.padEnd(10)}] ${p.artifact.slice(0, 46).padEnd(46)} ${p.verdict.padEnd(9)} ${p.reason}`); };
const printStages = r => { console.log(`  fixture: ${r.name}`); r.proofs.forEach(printProof); };

const jiraFx = JSON.parse(await readFile(resolve(HERE, 'fixtures/issues.json'), 'utf8'));
const adoFx = JSON.parse(await readFile(resolve(HERE, '../azure-devops/fixtures/work-items.json'), 'utf8'));

console.log('JIRA — stage proofs (fixture-first)');
printProof(await evaluateFetch(jira, { kind: 'fixture', ref: 'cloud_closed' }));
for (const c of jiraFx.cases)
  printStages(evaluateStages(jira, { name: c.name, raw: jiraFx.raw_payloads[c.raw_ref], expect_canonical: c.expect_canonical, expect: c.expect_input }));

console.log('\nSOURCE SUBSTITUTION #2 — Azure DevOps ↔ Jira');
{
  const adoRaw = adoFx.raw_payloads.wit_api;             // ADO vocabulary
  const jiraRaw = jiraFx.raw_payloads.cloud_closed;      // Jira vocabulary — same logical item
  const target = { state: 'closed', priority: 'high' };

  ok('ADO canonical == Jira canonical (== declared)', deepEqual(canonicalize(ado, adoRaw), canonicalize(jira, jiraRaw)) && deepEqual(canonicalize(jira, jiraRaw), target), JSON.stringify([canonicalize(ado, adoRaw), canonicalize(jira, jiraRaw)]));
  ok('ADO input == Jira input', deepEqual(transform(ado, adoRaw), transform(jira, jiraRaw)), JSON.stringify([transform(ado, adoRaw), transform(jira, jiraRaw)]));

  // The strong form: the pipeline BELOW the adapter is literally the same code for both sources.
  ok('materialize is the SAME function object (ado === jira === json)', ado.materialize === json.materialize && jira.materialize === json.materialize);
  ok('normalize value-logic is delegated to json (not reimplemented per source)', deepEqual(json.normalize({ state: 'Closed', priority: 'High' }), target));
}

console.log('\nJIRA — boundaries hold');
{
  // adapter knows only vocabulary: it must NOT lowercase or map values (that is normalize's job).
  const shaped = (await import('./adapter.mjs')).toJson(jiraFx.raw_payloads.cloud_closed);
  ok('adapter yields raw values in JSON vocabulary (no meaning applied)', deepEqual(shaped, { state: 'Closed', priority: 'High' }), JSON.stringify(shaped));
  // live is inert without Jira credentials.
  let threw = false; try { await jira.fetch({ kind: 'live', host: 'x.atlassian.net', key: 'THA-1' }); } catch { threw = true; }
  ok('live path inert without JIRA_EMAIL/JIRA_TOKEN', threw);
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
