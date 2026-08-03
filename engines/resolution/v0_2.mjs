// resolution v0.2 — v0.1 + cycle guard (non-DAG supersede -> DEFER). Passes v1∪v2∪v3.
const DEFECT = new Set(['deployed_defect', 'defect', 'reverted']);
const healthy = c => c.deployed === true && !DEFECT.has(c.lifecycle);
const t = d => new Date(d || 0).getTime();
function hasCycle(cs) {
  const sup = Object.fromEntries(cs.map(c => [c.id, c.supersedes])); const ids = new Set(cs.map(c => c.id));
  for (const c of cs) { let cur = c.id; const seen = new Set(); while (cur && ids.has(cur)) { if (seen.has(cur)) return true; seen.add(cur); cur = sup[cur]; } }
  return false;
}
function pick(cs) {
  if (cs.length === 1) return cs[0].id;
  if (hasCycle(cs)) return 'DEFER';
  const ids = new Set(cs.map(c => c.id));
  const superseded = new Set(cs.map(c => c.supersedes).filter(x => x && ids.has(x)));
  const heads = cs.filter(c => !superseded.has(c.id));
  if (heads.length === 1) return heads[0].id;
  const dep = heads.filter(healthy);
  if (dep.length === 1) return dep[0].id;
  const pool = dep.length ? dep : heads;
  const byDate = [...pool].sort((a, b) => t(b.asserted_at) - t(a.asserted_at));
  if (byDate.length >= 2 && t(byDate[0].asserted_at) === t(byDate[1].asserted_at)) return 'DEFER';
  return byDate[0].id;
}
export const engine = { id: 'resolution', version: 'v0.2', kind: 'supersede-head+lifecycle+cycle-guard', capabilities: ['authority', 'lifecycle', 'cycle_detection'], evaluate: ({ candidates }) => ({ decision: pick(candidates), version: 'v0.2' }) };
