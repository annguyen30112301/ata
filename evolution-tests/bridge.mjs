// Bridge helpers — auto-select the Knowledge Package from the work item itself, then judge.
// The work item declares its own type (System.WorkItemType); the package id follows from
// <org>-<type>. If no CONFIRMED package exists for that type, the verdict is DEFER (missing-policy)
// — the system refuses to guess, exactly as when a state is outside the lifecycle.
import { loadKnowledge, toEngineLifecycle } from '../knowledge/loader.mjs';
import { engine as engineV02 } from '../engines/transition/v0_2.mjs';
import { slug } from '../connectors/azure-devops/process.mjs';

export const workItemType = itemRaw => itemRaw?.fields?.['System.WorkItemType'];
export const packageIdFor = (org, type) => `${slug(org)}-${slug(type || 'unknown')}`;

export async function judge(pkgName, t) {
  let k;
  try { k = await loadKnowledge(pkgName); }
  catch { return { verdict: 'DEFER', knowledge: pkgName, reason: `missing-policy: no confirmed knowledge package '${pkgName}'` }; }
  const lifecycle = toEngineLifecycle(k);
  return { verdict: engineV02.evaluate({ ...t, lifecycle }).decision, knowledge: pkgName, mode: lifecycle.mode };
}
