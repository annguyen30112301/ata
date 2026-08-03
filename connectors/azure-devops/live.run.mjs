// Go-live runner — YOU run this with a real PAT; it acquires one real work item and prints the
// MaterializedInput { input, provenance }. The PAT is read only from the environment, never
// hard-coded, never logged. This is the ONLY step that touches the real world; everything it
// produces has already been proven equivalent to the fixture path (see live.test.mjs).
//
//   PowerShell:  $env:AZDO_PAT="<pat>"; node connectors/azure-devops/live.run.mjs <org> <project> <workItemId>
//   bash:        AZDO_PAT=<pat> node connectors/azure-devops/live.run.mjs <org> <project> <workItemId>
import { connector as ado } from './index.mjs';
import { collect } from '../sdk/collect.mjs';

const [org, project, id] = process.argv.slice(2);
if (!org || !project || !id) {
  console.error('usage: AZDO_PAT=<pat> node connectors/azure-devops/live.run.mjs <org> <project> <workItemId>');
  process.exit(1);
}

try {
  const materialized = await collect(ado, { kind: 'live', org, project, id });   // fetch(live) -> normalize -> materialize -> +provenance
  console.log(JSON.stringify(materialized, null, 2));
} catch (e) {
  console.error('LIVE FETCH FAILED:', e.message);
  process.exit(1);
}
