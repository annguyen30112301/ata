// examples/azure-devops — acquiring evidence from Azure DevOps, offline (from the locked fixture, no PAT).
//   node examples/azure-devops/demo.mjs
//
// Azure DevOps contributes exactly ONE new capability — evidence acquisition (fetch). Everything after
// (normalize/materialize) is DELEGATED to the already-proven JSON connector, so nothing is duplicated.
// This demo runs the ADO adapter+pipeline over the raw fixture payload and shows the two hops it proves:
//   raw ADO payload → canonical (meaning) → input (engine shape).
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connector as ado } from '../../connectors/azure-devops/index.mjs';
import { canonicalize, transform } from '../../connectors/sdk/collect.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const adoFx = JSON.parse(await readFile(resolve(HERE, '../../connectors/azure-devops/fixtures/work-items.json'), 'utf8'));

// Two DIFFERENT ADO API shapes of the SAME work item (the wit API and the analytics API).
for (const ref of Object.keys(adoFx.raw_payloads)) {
  const raw = adoFx.raw_payloads[ref];
  console.log(`\n${ref} — raw evidence (ADO vocabulary): keys = ${JSON.stringify(Object.keys(raw.fields || raw))}`);
  console.log('  canonical =', JSON.stringify(canonicalize(ado, raw)));
  console.log('  input     =', JSON.stringify(transform(ado, raw)));
}

const [wit, analytics] = Object.values(adoFx.raw_payloads);
console.log('\ntwo API shapes of one item → one canonical:',
  JSON.stringify(canonicalize(ado, wit)) === JSON.stringify(canonicalize(ado, analytics)));
console.log('\nGoing live adds only the fetch hop (a PAT); the pipeline below is unchanged. See README.md.');
