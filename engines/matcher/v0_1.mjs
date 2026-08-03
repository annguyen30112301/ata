// matcher v0.1 — + owner partition: a candidate with a different owner_key is a
// different identity. Learns ownership (structure), not specific strings.
const toks = s => (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const jac = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size && !B.size) return 1; const i = [...A].filter(x => B.has(x)).length; return i / (A.size + B.size - i || 1); };
const sim = (k, c) => 0.3 * (k.role === c.role ? 1 : 0) + 0.4 * (k.name === c.name ? 1 : jac(toks(k.name), toks(c.name))) + 0.3 * jac(toks(k.text), toks(c.text));
function decide(known, candidates) {
  const elig = candidates.filter(c => (c.owner_key || '') === (known.owner_key || ''));   // structural partition
  if (!elig.length) return 'SPLIT';
  const s = elig.map(c => ({ c, s: sim(known, c) })).sort((a, b) => b.s - a.s);
  const best = s[0], second = s[1] || { s: 0 };
  if (best.s >= 0.7 && (elig.length === 1 || best.s - second.s >= 0.05)) return 'MERGE:' + best.c.id;
  return best.s < 0.35 ? 'SPLIT' : 'DEFER';
}
export const engine = { id: 'matcher', version: 'v0.1', kind: 'owner-partition', capabilities: ['identity', 'owner_partition'], evaluate: ({ known, candidates }) => ({ decision: decide(known, candidates), version: 'v0.1' }) };
