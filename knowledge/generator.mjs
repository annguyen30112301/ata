// Benchmark Case Generator — turns a CONFIRMED Knowledge Package into benchmark cases, per policy mode.
//   restrictive : regression = every `allowed` edge (VALID); refutation = human `refutations` (INVALID)
//   permissive  : regression = observed edges that are NOT forbidden (VALID); refutation = `forbidden` (INVALID)
//   both        : guard = a synthetic out-of-lifecycle state (DEFER, knowledge:"missing-state")
// The human confirms lifecycle + policy (allowed OR forbidden) + a few key edges; the rest is generated.
// Each case carries `expected` (the human-confirmed expected verdict — the true oracle) + self-describing
// metadata: `dimension`, `knowledge` (why a DEFER), `knowledge_source`.
const pad = n => String(n).padStart(3, '0');
export const MISSING_STATE = '__not_in_lifecycle__';
const key = ([a, b]) => `${a}->${b}`;

export function generateCases(pkg) {
  const id = pkg.id, dim = pkg.dimension || 'lifecycle';
  const mode = pkg.policy?.mode || 'restrictive';
  const { states } = pkg.lifecycle;
  const cases = [];
  const reg = (from, to, i) => ({ id: `${id}-reg-${pad(i)}`, dimension: dim, role: 'regression', expected: 'VALID', from, to, knowledge_source: id });
  const ref = (from, to, i, why) => ({ id: `${id}-ref-${pad(i)}`, dimension: dim, role: 'refutation', expected: 'INVALID', criticality: 'critical', from, to, breaks: why, knowledge_source: id });

  if (mode === 'permissive') {
    const forbidden = pkg.lifecycle.forbidden || [];
    const forbiddenSet = new Set(forbidden.map(key));
    let edges = (pkg.observed?.transitions || []).filter(([a, b]) => a !== b && !forbiddenSet.has(key([a, b])));
    if (!edges.length) for (let i = 0; i < states.length - 1; i++) if (!forbiddenSet.has(key([states[i], states[i + 1]]))) edges.push([states[i], states[i + 1]]);
    edges.forEach(([a, b], i) => cases.push(reg(a, b, i + 1)));
    forbidden.forEach(([a, b], i) => cases.push(ref(a, b, i + 1, 'permissive policy forbids this edge')));
  } else {
    const allowed = pkg.lifecycle.allowed || [];
    allowed.forEach(([a, b], i) => cases.push(reg(a, b, i + 1)));
    (pkg.refutations || []).forEach((r, i) => cases.push(ref(r.from, r.to, i + 1, r.breaks || 'policy-forbidden edge')));
  }

  cases.push({ id: `${id}-guard-001`, dimension: dim, role: 'guard', expected: 'DEFER', criticality: 'critical',
    knowledge: 'missing-state', from: states[0], to: MISSING_STATE,
    breaks: 'over-reach on a state outside the declared lifecycle', knowledge_source: id });
  return cases;
}
