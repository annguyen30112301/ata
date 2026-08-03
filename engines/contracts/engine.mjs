// AVF Engine Contract — every engine, of every hypothesis, implements this.
//
//   export const engine = {
//     id: 'resolution', version: 'v0.2', kind: '...'      // identity
//     capabilities: ['authority', 'cycle_detection'],     // what assumptions it claims to handle
//     evaluate(input) -> { decision, confidence?, evidence?, version }
//   }
//
// `capabilities` is DECLARATIVE metadata. The runner never reads it (staying
// hypothesis-agnostic); it is carried through to the report so a dashboard can
// answer "which engine supports which assumption?" without hard-coding.
//
// The framework is hypothesis-AGNOSTIC. It never knows whether an engine is a
// matcher, a resolver, a grounder or an observer. It only knows:
//   - it can call engine.evaluate(input) and get back a `decision` string;
//   - it compares that `decision` to the case's `oracle` (string equality);
//   - the token ABSTAIN ('DEFER') is the universal "cannot decide safely".
//
// This is what lets a new hypothesis be added with ONLY a benchmark package + an
// engine adapter — the runner core never changes.
export const ABSTAIN = 'DEFER';
