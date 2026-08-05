// The Decision Properties Test — Phase D (Validation). Not fixture → expected-output, but LAW → property: the
// algebraic invariants each pipeline stage must obey, checked over synthetic inputs and permutations. No business
// fixture, no expected recommendation — only the mathematics that makes the pipeline hard to break by accident.
//   node decision/properties.test.mjs
import { mergeByIdentity, sortRecommendations, recommend, recommendationSnapshot, priorityPolicy, PRIORITY } from './model.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const perms = xs => [xs, [...xs].reverse(), [...xs.slice(1), xs[0]]];   // a few fixed permutations (deterministic)

// Synthetic candidates (pre-merge) and recommendations (pre-sort) — content is arbitrary; only shape matters.
const C = (id, ev, pk) => ({ id, kind: 'REVIEW', subject: { hypothesis: id.split(':')[0] }, evidence: [ev], policyKeys: [pk] });
const R = (id, priority) => ({ id, priority, kind: 'REVIEW', subject: {}, evidence: [] });

try {
  console.log('DECISION PROPERTIES — algebraic laws of the pipeline (Phase D)');

  // MERGE — grouping by identity is a fold; it is idempotent and associative, and keys on id ALONE.
  {
    const a1 = C('A:review', { signal: 's1', value: 1 }, 'verdict_away');
    const a2 = C('A:review', { signal: 's2', value: 2 }, 'override_rate');
    const b1 = C('B:hold', { signal: 's3', value: 3 }, 'would_block');
    ok('merge is idempotent: merge(merge(x)) = merge(x)', eq(mergeByIdentity(mergeByIdentity([a1, a2, b1])), mergeByIdentity([a1, a2, b1])));
    ok('merge is associative: merge([a1,a2,b1]) = merge([merge([a1,a2]), b1])', eq(mergeByIdentity([a1, a2, b1]), mergeByIdentity([...mergeByIdentity([a1, a2]), b1])));
    // Identity is the id and nothing else: two candidates with the same id fold even if other fields differ.
    const weird = { ...a2, kind: 'HOLD', subject: { scope: 'project' } };
    ok('identity is the id alone: same id folds regardless of other fields', mergeByIdentity([a1, weird]).length === 1);
  }

  // SORT — a total order (priority rank, then id): idempotent and permutation-invariant.
  {
    const recs = [R('b:review', 'MEDIUM'), R('a:review', 'HIGH'), R('c:hold', 'HIGH'), R('a:investigate', 'LOW')];
    ok('sort is idempotent: sort(sort(x)) = sort(x)', eq(sortRecommendations(sortRecommendations(recs)), sortRecommendations(recs)));
    ok('sort is permutation-invariant: every ordering of the input sorts to the same result', perms(recs).every(p => eq(sortRecommendations(p), sortRecommendations(recs))));
    ok('sort does not mutate its input', (() => { const copy = JSON.stringify(recs); sortRecommendations(recs); return JSON.stringify(recs) === copy; })());
  }

  // POLICY COMPOSITION — stage application is a function composition: order matters when stages do not commute.
  {
    const snap = { generated_at: 'p', rule: { would_block: 3, evaluated: 5, context: { env: 'production' } }, review: { override_rate: 0 }, trend: { status: 'no history yet' } };
    const setLow = rec => ({ ...rec, priority: PRIORITY.LOW });
    const dropLow = rec => (rec.priority === PRIORITY.LOW ? null : rec);
    // setLow ∘ dropLow ≠ dropLow ∘ setLow: one suppresses everything, the other keeps it (now LOW).
    const ab = recommend(snap, { policies: [priorityPolicy, setLow, dropLow] });   // → set LOW, then dropped
    const ba = recommend(snap, { policies: [priorityPolicy, dropLow, setLow] });   // → not LOW yet (kept), then set LOW
    ok('policy composition is NOT commutative: [setLow, dropLow] ≠ [dropLow, setLow]', !eq(ab, ba) && ab.length === 0 && ba.length === 1);
    ok('the identity policy leaves a group unchanged: [priority, id] = [priority]', eq(recommend(snap, { policies: [priorityPolicy, r => r] }), recommend(snap, { policies: [priorityPolicy] })));
  }

  // DETERMINISM — recommend is a pure function of the snapshot CONTENT, not of its collection order. Permuting the
  // iteration order of the input produces an identical result (sort makes the pipeline order-independent).
  {
    const H = dir => ({ verdict: { from: 'x', to: 'y', direction: dir }, ccw: { from: 0, to: 0, direction: 'flat' }, metadata: { observations: 2 } });
    const snapAB = { generated_at: 's', trend: { hypotheses: { H4: H('away_from_supported'), H9: H('away_from_supported') }, stability: {} }, review: { override_rate: 0 } };
    const snapBA = { generated_at: 's', trend: { hypotheses: { H9: H('away_from_supported'), H4: H('away_from_supported') }, stability: {} }, review: { override_rate: 0 } };
    ok('recommend is order-independent: permuting the snapshot\'s hypotheses yields identical recommendations', eq(recommend(snapAB), recommend(snapBA)));
    ok('recommend is deterministic: the same snapshot yields the same recommendations, twice', eq(recommend(snapAB), recommend(snapAB)));
    ok('recommendationSnapshot.recommendations = recommend (the artifact adds only generated_at + source)', eq(recommendationSnapshot(snapAB, { generated_at: 'X' }).recommendations, recommend(snapAB)));
  }
} finally { /* pure — nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
