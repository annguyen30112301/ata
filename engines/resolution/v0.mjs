// resolution v0 (floor) — weighted provenance, DEFER on tie. Refuted by RH3a/RH3b.
const t = d => new Date(d || 0).getTime();
export const engine = {
  id: 'resolution', version: 'v0', kind: 'weighted-provenance', capabilities: ['authority'],
  evaluate({ candidates: cs }) {
    if (cs.length === 1) return { decision: cs[0].id, version: 'v0' };
    const sup = new Set(cs.map(c => c.supersedes).filter(Boolean));
    const score = c => (c.deployed ? 1000 : 0) + (sup.has(c.id) ? 0 : 100) + t(c.asserted_at) / 8.64e7 + c.confidence;
    const r = [...cs].sort((a, b) => score(b) - score(a));
    return { decision: score(r[0]) === score(r[1]) ? 'DEFER' : r[0].id, version: 'v0' };
  },
};
