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

// DEFAULT_POLICY — the DATA of the default policy: the priority each signal contributes (contract §4, priority is
// a policy choice, not an analytic fact). collect only TAGS a candidate with its policyKey; the policy STAGE
// (defaultPolicy, below) reads this table. An injected policy may ignore it entirely (recommend's `policy` option).
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
// A CANDIDATE (pre-policy): identity + evidence + the signal that produced it (policyKeys). It carries NO
// priority — detection tags the signal; the policy stage assigns priority later. policyKeys is a list so merge
// can accumulate contributing signals the way evidence accumulates.
const rec = (policyKey, kind, subject, evidence) => ({ id: idOf(subject, kind), kind, subject, evidence, policyKeys: [policyKey] });

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

// mergeByIdentity — GROUP candidates that share an id (= the identity (subject, kind)) into one, accumulating
// their evidence AND their contributing signals (policyKeys). It owns grouping only: it does NOT decide priority
// — that is the policy stage's job (SRP). This is the stage the collect→sort seam was built for (§7). The §4 rule
// set never emits two candidates with the same id, so on today's snapshots the fold is a NO-OP; it activates the
// moment a rule shares an identity.
function mergeByIdentity(candidates) {
  const byId = new Map();
  for (const c of candidates) {
    const prev = byId.get(c.id);
    if (!prev) { byId.set(c.id, { ...c, evidence: [...c.evidence], policyKeys: [...c.policyKeys] }); continue; }
    prev.evidence.push(...c.evidence);        // same concern → more support, not a new row
    prev.policyKeys.push(...c.policyKeys);     // and more contributing signals for the policy to weigh
  }
  return [...byId.values()];
}
export { mergeByIdentity };

// priorityOf — the default priority for a group: the MOST-URGENT of its contributing signals' priorities
// (DEFAULT_POLICY). Pure. The building block the priority policy stage uses.
const priorityOf = group => group.policyKeys.map(k => DEFAULT_POLICY[k]).reduce((a, b) => (RANK[b] < RANK[a] ? b : a));

// A POLICY is a composable STAGE: `(rec) => rec | null`. It reads the working recommendation (a merged group),
// returns it enriched/modified, or returns `null` to SUPPRESS it. A stage owns ONE concern and knows nothing of
// the others — priority does not know suppression; suppression does not know priority (composition, C.3).
export const priorityPolicy = rec => ({ ...rec, priority: priorityOf(rec) });

// DEFAULT_POLICIES — the default policy PIPELINE. Just the priority stage today, so behaviour is unchanged;
// adding stages (escalation, suppression, …) is additive — no change here, and no change to the DTO.
export const DEFAULT_POLICIES = Object.freeze([priorityPolicy]);

// applyPolicy — run each merged group through the policy PIPELINE, in order. A stage may modify the working
// recommendation or return null to drop it (suppression). The internal `policyKeys` never reach the DTO; the
// finished recommendation is emitted in canonical key order.
function applyPolicy(groups, policies) {
  const out = [];
  for (const g of groups) {
    let rec = g;
    for (const p of policies) { rec = p(rec); if (rec == null) break; }
    if (rec != null) out.push({ id: rec.id, priority: rec.priority, kind: rec.kind, subject: rec.subject, evidence: rec.evidence });
  }
  return out;
}

// recommend — the pipeline: collect → merge → policy pipeline → sort. The policy is a COMPOSITION of stages
// (default: just priority), each owning one concern; a stage may enrich or suppress. Injectable, behaviour-
// preserving by default, and still no DTO change: a recommendation carries {id, priority, kind, subject, evidence}.
export function recommend(snapshot, { policies = DEFAULT_POLICIES } = {}) {
  return sortRecommendations(applyPolicy(mergeByIdentity(collectRecommendations(snapshot)), policies));
}

// RecommendationSnapshot — the DTO (contract §3). Pure over the snapshot: identical snapshot yields an identical
// snapshot save for `generated_at`. `source` records WHICH snapshot this reads (provenance); no triggering signal
// → { recommendations: [] } (not an error). This is the sole contract between Decision and its consumers.
export function recommendationSnapshot(snapshot, { generated_at = new Date().toISOString(), policies } = {}) {
  return {
    generated_at,
    source: { snapshot_generated_at: snapshot?.generated_at ?? null },
    recommendations: recommend(snapshot, { policies }),
  };
}
