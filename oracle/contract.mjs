// Oracle Runtime — the RUNTIME realization of the Oracle Contract (until now, documented only).
// A machine VERDICT is a claim; a human REVIEW turns it into confirmed knowledge (or disputes it).
// This closes the loop the whole program was missing:
//   evidence -> benchmark -> engine -> VERDICT -> human REVIEW -> LEARNING (knowledge or benchmark)
//
// A Review obeys the Oracle Contract, now enforced at runtime, not on paper:
//   - an oracle is created/confirmed ONLY by a human      -> a Review must carry a `reviewer`;
//   - it may change, but only WITH history and a reason   -> the store is APPEND-ONLY + `reason` is required;
//   - a connector/engine may not mint one                 -> only submitReview() writes, and it needs a human;
//   - the kernel only reads oracles                        -> the runtime never feeds back automatically —
//                                                             it proposes a LEARNING action a human still ratifies.
export const DECISION = { CONFIRM: 'confirm', OVERRIDE: 'override' };
export const defineReview = r => r;   // identity helper (symmetry with the other contracts)
