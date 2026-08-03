// resolution v0.1 — supersede-head + deployed-if-healthy + defer-on-tie. Refuted by RH3c-001 (cycle).
const DEFECT = new Set(['deployed_defect', 'defect', 'reverted']);
const healthy = c => c.deployed === true && !DEFECT.has(c.lifecycle);
const t = d => new Date(d || 0).getTime();
function pick(cs) {
  if (cs.length === 1) return cs[0].id;
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
export const engine = { id: 'resolution', version: 'v0.1', kind: 'supersede-head+lifecycle', capabilities: ['authority', 'lifecycle'], evaluate: ({ candidates }) => ({ decision: pick(candidates), version: 'v0.1' }) };
