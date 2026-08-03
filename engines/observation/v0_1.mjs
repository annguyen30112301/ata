// observation v0.1 — invariant/variant: identity preserved if the INVARIANT fields
// (role, tag, cls) are stable, even if surface (name, text) varies by context.
const INV = ['role', 'tag', 'cls'];
export const engine = {
  id: 'observation', version: 'v0.1', kind: 'invariant-variant', capabilities: ['observation', 'invariant_projection'],
  evaluate: ({ a, b }) => ({ decision: INV.every(f => a[f] === b[f]) ? 'IDENTITY_PRESERVED' : 'UNSTABLE', version: 'v0.1' }),
};
