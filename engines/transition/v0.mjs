// transition@v0 — weak: "a transition is valid if both endpoints are known states." It does not
// consult the allowed edges and does not know what to do with a state outside the lifecycle.
// The H4 benchmark is designed to refute exactly this: it allows illegal edges (new->closed,
// closed->new) and over-reaches on out-of-lifecycle targets.
export const engine = {
  id: 'transition', version: 'v0', kind: 'known-states-only', capabilities: ['transition'],
  evaluate({ from, to, lifecycle }) {
    const known = new Set(lifecycle.states);
    return { decision: known.has(from) && known.has(to) ? 'VALID' : 'INVALID', version: 'v0' };
  },
};
