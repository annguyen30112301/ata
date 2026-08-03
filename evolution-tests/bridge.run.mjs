// Go-live bridge — closes the loop on REAL data and AUTO-SELECTS the Knowledge Package from the
// work item's own type (System.WorkItemType). No AVF_KNOWLEDGE needed (though it still overrides).
//   ADO work item → type → knowledge/<org>-<type> → lifecycle+policy → transition@v0.2 → verdict
// If there is no confirmed package for that type, the verdict is DEFER (missing-policy): don't guess.
//
//   PowerShell:  $env:AZDO_PAT="<pat>"; node evolution-tests/bridge.run.mjs taggle "Taggle Health App - Research" 9283
import { fetchLive, fetchLivePaged } from '../connectors/azure-devops/fetch.mjs';
import { toTransition } from '../connectors/azure-devops/transitions.mjs';
import { workItemType, packageIdFor, judge } from './bridge.mjs';

const [org, project, id] = process.argv.slice(2);
if (!org || !project || !id) {
  console.error('usage: AZDO_PAT=<pat> node evolution-tests/bridge.run.mjs <org> <project> <workItemId>');
  process.exit(1);
}

try {
  const item = await fetchLive({ org, project, id });               // read the work item -> its type
  const type = workItemType(item.raw);
  const pkgName = process.env.AVF_KNOWLEDGE || packageIdFor(org, type);   // auto-select (override with env)
  const updates = await fetchLivePaged({ org, project, path: `wit/workItems/${id}/updates` });
  const t = toTransition(updates.raw);
  const res = await judge(pkgName, t);
  console.log(JSON.stringify({ source: updates.source, workItemType: type, transition: t, hypothesis: 'H4', engine: 'transition@v0.2', ...res }, null, 2));
} catch (e) {
  console.error('BRIDGE LIVE FAILED:', e.message);
  process.exit(1);
}
