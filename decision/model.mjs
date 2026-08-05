// Decision — the model. A pure projection of ONE AnalyticsSnapshot into a RecommendationSnapshot; see
// docs/decision.contract.md and docs/adr/0002-decision-contract.md for the contract. It answers exactly one
// question — "what action follows from the evidence?" — and NOTHING else: it advises, never acts, never judges
// correctness, and reads the snapshot ALONE. Its dependency graph reaches no fs: it imports only the direction
// vocabulary leaf (analytics/directions.mjs), never analytics/model.mjs — proven in decision/boundary.test.mjs.
//
// Same snapshot → same recommendations (save for generated_at): a recommendation is a projection, not an opinion.
// Every recommendation carries an id (its stable identity), a priority (a POLICY choice), a kind, a subject
// (the locus), and an evidence[] (the snapshot field(s) that fired it, walkable back to the number).
import { VERDICT_DIRECTION, CCW_DIRECTION } from '../analytics/directions.mjs';

// ---- Closed enums (exactly like VerdictDirection): a consumer never has to guess. ----
export const PRIORITY = Object.freeze({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' });
export const KIND = Object.freeze({ REVIEW: 'REVIEW', INVESTIGATE: 'INVESTIGATE', HOLD: 'HOLD' });

// KIND_KEY — the SEMANTIC key an id is built from, kept DELIBERATELY separate from the enum's display value
// (contract §3: identity is by concept, not by spelling). The id keys on the concept and encodes for humans;
// renaming a KIND label must be a deliberate edit HERE, so a rename can never silently re-key existing
// recommendations. Never write `${subject}:${enumValue}` — that conflates encoding with identity.
const KIND_KEY = Object.freeze({ [KIND.REVIEW]: 'review', [KIND.INVESTIGATE]: 'investigate', [KIND.HOLD]: 'hold' });

// DEFAULT_POLICY — priority is a POLICY choice, not an analytic fact (contract §4). v0 reads priorities from
// this one table (the default policy); a v0+ policy layer would inject an alternative without touching the signal
// detection below. Priorities are READ from here, never inlined at a call site.
export const DEFAULT_POLICY = Object.freeze({
  verdict_away: PRIORITY.HIGH,      // implementation moving away from supported
  ccw_rising: PRIORITY.HIGH,        // confident-and-wrong on a critical case is growing
  specimen_flip: PRIORITY.MEDIUM,   // a fixed specimen changed behaviour → the ground moved
  would_block: PRIORITY.HIGH,       // the production gate would block current reports
  override_rate: PRIORITY.MEDIUM,   // humans overrule the machine at least as often as they confirm
});

// THRESHOLDS — the contract's numbers live in ONE place so a test can pin them (contract §4).
export const THRESHOLDS = Object.freeze({ flips: 1, would_block: 0, override_rate: 0.5 });

// subject-ref — project the subject ADT to the single token an id names. It names the REF, never the field
// layout, so normalizing subject to { type, ref } later leaves every id stable (contract §3, subject-is-an-ADT).
const subjectRef = s => s.scope ?? (s.engine ? `${s.hypothesis}·${s.engine}` : s.hypothesis);
const idOf = (subject, kind) => `${subjectRef(subject)}:${KIND_KEY[kind]}`;   // serialize(subject-ref, semantic-kind)
const rec = (policyKey, kind, subject, evidence) => ({ id: idOf(subject, kind), priority: DEFAULT_POLICY[policyKey], kind, subject, evidence });

const RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };   // ordering: priority (HIGH first), then id — deterministic

// resolveSignal — walk an evidence `signal` (a dotted path, `["key"]` for map keys with dots/spaces) back to its
// value in the snapshot. This is the operational meaning of the auditability promise: every recommendation's
// evidence resolves to the exact number that produced it. A consumer (or the Decision Test) audits with this.
export function resolveSignal(snapshot, path) {
  const segs = [];
  const re = /\["([^"]+)"\]|([^.[\]]+)/g;
  let m;
  while ((m = re.exec(path))) segs.push(m[1] ?? m[2]);
  return segs.reduce((o, k) => (o == null ? undefined : o[k]), snapshot);
}

// collectRecommendations — DETECT signals and BUILD one recommendation per firing (contract §4). Pure and
// UNSORTED; one row per firing because v0 never merges. This is the seam a v0+ evidence-merge step slots into:
// it folds same-(subject,kind) rows BETWEEN collect and sort, so collect never learns about merging. A signal
// that is insufficient / unchanged / flat / zero produces nothing: silence is honest (contract §2).
function collectRecommendations(snapshot) {
  const out = [];
  const trend = snapshot?.trend;
  if (trend && !trend.status) {                                   // absent trend or "no history yet" → no trend signals
    for (const [h, m] of Object.entries(trend.hypotheses ?? {})) {
      if (m.verdict?.direction === VERDICT_DIRECTION.AWAY)
        out.push(rec('verdict_away', KIND.REVIEW, { hypothesis: h },
          [{ signal: `trend.hypotheses.${h}.verdict.direction`, value: m.verdict.direction }]));
      if (m.ccw?.direction === CCW_DIRECTION.RISING)
        out.push(rec('ccw_rising', KIND.INVESTIGATE, { hypothesis: h },
          [{ signal: `trend.hypotheses.${h}.ccw.direction`, value: m.ccw.direction }]));
    }
    for (const [key, s] of Object.entries(trend.stability ?? {})) {
      if (s.flips >= THRESHOLDS.flips) {
        const [hypothesis, engine] = key.split(' · ');
        out.push(rec('specimen_flip', KIND.INVESTIGATE, { hypothesis, engine },
          [{ signal: `trend.stability[${JSON.stringify(key)}].flips`, value: s.flips }]));
      }
    }
  }
  if (snapshot?.rule && snapshot.rule.would_block > THRESHOLDS.would_block)
    out.push(rec('would_block', KIND.HOLD, { scope: 'project' },
      [{ signal: 'rule.would_block', value: snapshot.rule.would_block }]));
  if (snapshot?.review && snapshot.review.total > 0 && snapshot.review.override_rate >= THRESHOLDS.override_rate)
    out.push(rec('override_rate', KIND.REVIEW, { scope: 'project' },
      [{ signal: 'review.override_rate', value: snapshot.review.override_rate }]));
  return out;
}

// sortRecommendations — the DTO's deterministic order: priority (HIGH first), then id. Pure, non-mutating.
const sortRecommendations = recs => [...recs].sort((a, b) => RANK[a.priority] - RANK[b.priority] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

// recommend — the v0 pipeline: collect → sort. (A v0+ merge step inserts between the two, contract §7.)
export function recommend(snapshot) {
  return sortRecommendations(collectRecommendations(snapshot));
}

// RecommendationSnapshot — the DTO (contract §3). Pure over the snapshot: identical snapshot yields an identical
// snapshot save for `generated_at`. `source` records WHICH snapshot this reads (provenance); no triggering signal
// → { recommendations: [] } (not an error). This is the sole contract between Decision and its consumers.
export function recommendationSnapshot(snapshot, { generated_at = new Date().toISOString() } = {}) {
  return {
    generated_at,
    source: { snapshot_generated_at: snapshot?.generated_at ?? null },
    recommendations: recommend(snapshot),
  };
}
