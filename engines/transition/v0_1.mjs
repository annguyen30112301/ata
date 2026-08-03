// transition@v0.1 — lifecycle-aware: consults the declared allowed edges, and DEFERS when a state
// is outside the lifecycle (it cannot decide, so it must not guess). Passes the H4 benchmark.
export const engine = {
  id: 'transition', version: 'v0.1', kind: 'lifecycle-aware', capabilities: ['transition', 'lifecycle'],
  evaluate({ from, to, lifecycle }) {
    const known = new Set(lifecycle.states);
    if (!known.has(from) || !known.has(to)) return { decision: 'DEFER', version: 'v0.1' };   // outside lifecycle -> cannot decide
    const allowed = new Set(lifecycle.allowed.map(([a, b]) => `${a}->${b}`));
    return { decision: allowed.has(`${from}->${to}`) ? 'VALID' : 'INVALID', version: 'v0.1' };
  },
};
