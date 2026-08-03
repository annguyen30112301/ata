// grounding v0 — coarse category compare. Misses within-category conflicts (RH2b),
// and has no slot for dual grounded sources (RH2c). Refuted by both.
const LEX = [['destructive', ['delete', 'remove', 'wipe', 'erase']], ['payment', ['pay', 'charge', 'transfer', 'donate', 'signup', 'purchase']],
  ['navigate', ['navigate', 'docs', 'documentation', 'guide', 'guides', 'reference']], ['search', ['search', 'query', 'filter']]];
const cat = t => { const s = (t || '').toLowerCase(); for (const [c, ks] of LEX) if (ks.some(k => s.includes(k))) return c; return 'UNKNOWN'; };
function decide({ representation_claim, grounded_claim, grounded_claims }) {
  if (grounded_claims) return 'NO_FLAG';                 // no slot for two sources -> naive no-conflict
  const rc = cat(representation_claim), gc = cat(grounded_claim);
  if (rc === 'UNKNOWN' || gc === 'UNKNOWN') return 'DEFER';
  return rc !== gc ? 'FLAG' : 'NO_FLAG';
}
export const engine = { id: 'grounding', version: 'v0', kind: 'coarse-category', capabilities: ['grounding_category'], evaluate: i => ({ decision: decide(i), version: 'v0' }) };
