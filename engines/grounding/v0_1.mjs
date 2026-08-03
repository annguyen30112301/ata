// grounding v0.1 — finer (category + object tokens + numbers) + DEFER on dual source.
// Fixes RH2b and RH2c, BUT regresses on relabels (Guides vs documentation = same
// meaning, disjoint tokens -> false conflict). Kept to show the regression gate work:
// token comparison cannot equate synonyms -> H2 needs a SEMANTIC engine, not this.
const LEX = [['destructive', ['delete', 'remove', 'wipe', 'erase']], ['payment', ['pay', 'charge', 'transfer', 'donate', 'signup', 'purchase']],
  ['navigate', ['navigate', 'docs', 'documentation', 'guide', 'guides', 'reference']], ['search', ['search', 'query', 'filter']]];
const KEYS = new Set(LEX.flatMap(([, ks]) => ks));
const STOP = new Set(['the', 'a', 'to', 'of', 'on', 'site', 'user', 'now', 'later', 'this']);
const cat = t => { const s = (t || '').toLowerCase(); for (const [c, ks] of LEX) if (ks.some(k => s.includes(k))) return c; return 'UNKNOWN'; };
const nums = t => (String(t).match(/\d[\d,]*/g) || []).map(x => +x.replace(/,/g, ''));
const obj = t => (t || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w) && !KEYS.has(w));
const disjoint = (a, b) => { const B = new Set(b); return !a.some(x => B.has(x)); };
function decide({ representation_claim, grounded_claim, grounded_claims }) {
  if (grounded_claims) return 'DEFER';                   // two independent sources -> H2 may not resolve
  const rc = cat(representation_claim), gc = cat(grounded_claim);
  if (rc === 'UNKNOWN' || gc === 'UNKNOWN') return 'DEFER';
  if (rc !== gc) return 'FLAG';
  const nd = JSON.stringify(nums(representation_claim).sort()) !== JSON.stringify(nums(grounded_claim).sort());
  return (nd || disjoint(obj(representation_claim), obj(grounded_claim))) ? 'FLAG' : 'NO_FLAG';
}
export const engine = { id: 'grounding', version: 'v0.1', kind: 'finer-tokens', capabilities: ['grounding_category', 'token_overlap'], evaluate: i => ({ decision: decide(i), version: 'v0.1' }) };
