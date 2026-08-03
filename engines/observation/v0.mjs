// observation v0 — blunt: any field differs -> UNSTABLE. Refuted by RH0a (locale).
const F = ['role', 'tag', 'cls', 'name', 'text'];
export const engine = {
  id: 'observation', version: 'v0', kind: 'blunt-compare', capabilities: ['observation'],
  evaluate: ({ a, b }) => ({ decision: F.every(f => a[f] === b[f]) ? 'IDENTITY_PRESERVED' : 'UNSTABLE', version: 'v0' }),
};
