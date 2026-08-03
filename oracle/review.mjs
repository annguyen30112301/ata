// Oracle Runtime — submit a human review of a machine verdict, then route it to a LEARNING action.
// The runtime never learns silently: it proposes; a human ratifies before anything is applied.
import { randomUUID } from 'node:crypto';
import { DECISION } from './contract.mjs';
import { record } from './store.mjs';

export function validateReview(r) {
  if (!r?.reviewer) throw new Error('review: a reviewer is required — only a human confirms an oracle');
  if (!r?.reason) throw new Error('review: a reason is required — decisions carry history + reason');
  if (!Object.values(DECISION).includes(r?.decision)) throw new Error(`review: decision must be ${Object.values(DECISION).join(' | ')}`);
  if (!r?.subject?.hypothesis) throw new Error('review: subject must name the hypothesis');
  if (r.verdict === undefined) throw new Error('review: the machine verdict being reviewed is required');
  if (r.decision === DECISION.OVERRIDE && r.human_verdict === undefined) throw new Error('review: an override must state the human_verdict');
  return true;
}

// Record a review (append-only). Returns the stamped review. Set opts.store=false to validate without writing.
export async function submitReview(r, opts = {}) {
  validateReview(r);
  const review = { id: randomUUID(), timestamp: new Date().toISOString(), ...r };
  if (opts.store !== false) await record(review, opts.file);
  return review;
}

// Route a review to the next LEARNING action — a SUGGESTION, not an auto-applied change.
//   confirm + DEFER            -> a knowledge-note (a confirmed domain fact, e.g. a process gap)
//   confirm + any other verdict-> reinforced (human agrees the engine + benchmark are right)
//   override                   -> a benchmark-correction proposal (the human's verdict, with reason + history)
export function suggestLearning(review) {
  if (review.decision === DECISION.CONFIRM) {
    if (String(review.verdict).startsWith('DEFER'))
      return { kind: 'knowledge-note', subject: review.subject, note: review.reason };
    return { kind: 'reinforced', subject: review.subject };
  }
  return { kind: 'benchmark-correction', subject: review.subject, from: review.verdict, to: review.human_verdict, reason: review.reason };
}
