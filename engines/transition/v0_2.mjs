// transition@v0.2 — POLICY-MODE aware. The Knowledge Package declares the mode; the engine only
// reads it. Closed-world over STATES (a state outside the lifecycle -> DEFER), but the transition
// judgement follows the declared policy:
//   restrictive : edge must be in `allowed`      -> else INVALID   (a strict state machine)
//   permissive  : edge is VALID unless in `forbidden`               (ADO-like: any->any minus a few bans)
// This lets one engine serve both a rigid workflow and an org that only declares what it forbids —
// and leaves room for a future `conditional` mode without touching the architecture.
export const engine = {
  id: 'transition', version: 'v0.2', kind: 'policy-mode-aware',
  capabilities: ['transition', 'lifecycle', 'policy-mode'],
  evaluate({ from, to, lifecycle }) {
    const known = new Set(lifecycle.states);
    if (!known.has(from) || !known.has(to)) return { decision: 'DEFER', version: 'v0.2' };   // missing-state -> cannot decide
    const edge = `${from}->${to}`;
    if (lifecycle.mode === 'permissive') {
      const forbidden = new Set((lifecycle.forbidden || []).map(([a, b]) => `${a}->${b}`));
      return { decision: forbidden.has(edge) ? 'INVALID' : 'VALID', version: 'v0.2' };
    }
    const allowed = new Set((lifecycle.allowed || []).map(([a, b]) => `${a}->${b}`));   // restrictive (default)
    return { decision: allowed.has(edge) ? 'VALID' : 'INVALID', version: 'v0.2' };
  },
};
