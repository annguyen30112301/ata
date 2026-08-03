// examples/jira — evidence acquisition, offline (from the locked fixture, no token).
//   node examples/jira/demo.mjs
//
// A connector reduces a source's raw payload to a canonical (meaning). Jira and Azure DevOps speak
// different vocabularies; this prints the canonical each produces and the sha256 of each. If the
// hashes match, Source Substitution holds — the reader concludes it, the code does not assert it.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connector as jira } from '../../connectors/jira/index.mjs';
import { connector as ado } from '../../connectors/azure-devops/index.mjs';
import { canonicalize, transform, checksum } from '../../connectors/sdk/collect.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const load = async (p) => JSON.parse(await readFile(resolve(HERE, p), 'utf8'));

const jiraRaw = (await load('../../connectors/jira/fixtures/issues.json')).raw_payloads.cloud_closed;
const adoRaw = (await load('../../connectors/azure-devops/fixtures/work-items.json')).raw_payloads.wit_api;

const row = (label, connector, raw) => {
  const canonical = canonicalize(connector, raw);
  console.log(`  ${label.padEnd(6)} canonical=${JSON.stringify(canonical).padEnd(38)} sha256=${checksum(canonical).slice(0, 16)}`);
  return checksum(canonical);
};

console.log('raw evidence (source vocabulary):');
console.log(`  jira   fields.status.name=${JSON.stringify(jiraRaw.fields.status.name)}  fields.priority.name=${JSON.stringify(jiraRaw.fields.priority.name)}`);
console.log(`  ado    System.State=${JSON.stringify(adoRaw.fields['System.State'])}  Microsoft.VSTS.Common.Priority=${JSON.stringify(adoRaw.fields['Microsoft.VSTS.Common.Priority'])}`);

console.log('\nraw → canonical, and its hash:');
const jiraHash = row('jira', jira, jiraRaw);
const adoHash = row('ado', ado, adoRaw);

console.log('\nsha256(jira canonical) === sha256(ado canonical) :', jiraHash === adoHash);
console.log('jira.materialize === ado.materialize            :', jira.materialize === ado.materialize);
console.log('jira input                                      :', JSON.stringify(transform(jira, jiraRaw)));
