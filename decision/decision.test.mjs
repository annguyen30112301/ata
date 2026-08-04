// The Decision Test — the executable spec of docs/decision.contract.md §6, fixture-first (mirrors
// snapshot.test.mjs / trend.test.mjs). The fixture is a hand-built AnalyticsSnapshot with KNOWN signals; the
// bars assert the recommendations that the §4 rule set must produce from it — nothing more, nothing invented.
//   node decision/decision.test.mjs
import { recommend, recommendationSnapshot, resolveSignal, PRIORITY, KIND, THRESHOLDS } from './model.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const byId = (recs, id) => recs.find(r => r.id === id);

// A snapshot that fires every §4 rule exactly once: H4 drifting away (REVIEW) with rising ccw (INVESTIGATE),
// a fixed specimen H5·referential@v0.3 that flipped (INVESTIGATE), a production gate that would block (HOLD),
// and a human override majority (REVIEW). Numbers are hand-read so the expected recommendations are known.
const full = {
  generated_at: '2026-08-04T00:00:00.000Z',
  overview: { reports: 2, reviews: 4, hypotheses: 2, engines: 2 },
  benchmark: {},
  review: { total: 4, confirm: 1, override: 3, confirm_rate: 0.25, override_rate: 0.75, by_hypothesis: {} },
  rule: { evaluated: 5, context: { env: 'production' }, action_distribution: { block: 3, warn: 0, allow: 2 }, would_block: 3, by_rule: {} },
  trend: {
    hypotheses: {
      H4: { verdict: { from: 'SUPPORTED', to: 'INVALID', direction: 'away_from_supported' }, ccw: { from: 0, to: 2, direction: 'rising' }, metadata: { observations: 3 } },
    },
    stability: { 'H5 · referential@v0.3': { flips: 2, metadata: { observations: 3 } } },
  },
};

// Ordered by priority (HIGH first) then id — the deterministic order the DTO promises.
const EXPECTED_IDS = ['H4:investigate', 'H4:review', 'project:hold', 'H5·referential@v0.3:investigate', 'project:review'];

try {
  console.log('DECISION — §6 acceptance (a hand-built AnalyticsSnapshot with known signals)');

  // Bar 1 — Each §4 rule fires exactly as specified: right priority, kind, subject.
  {
    const r = recommend(full);
    ok('1. verdict away_from_supported → HIGH · REVIEW on H4', eq(byId(r, 'H4:review'), { id: 'H4:review', priority: PRIORITY.HIGH, kind: KIND.REVIEW, subject: { hypothesis: 'H4' }, evidence: [{ signal: 'trend.hypotheses.H4.verdict.direction', value: 'away_from_supported' }] }), JSON.stringify(byId(r, 'H4:review')));
    ok('1. ccw rising → HIGH · INVESTIGATE on H4', eq(byId(r, 'H4:investigate'), { id: 'H4:investigate', priority: PRIORITY.HIGH, kind: KIND.INVESTIGATE, subject: { hypothesis: 'H4' }, evidence: [{ signal: 'trend.hypotheses.H4.ccw.direction', value: 'rising' }] }));
    ok('1. fixed-specimen flip ≥1 → MEDIUM · INVESTIGATE on H5·referential@v0.3', eq(byId(r, 'H5·referential@v0.3:investigate'), { id: 'H5·referential@v0.3:investigate', priority: PRIORITY.MEDIUM, kind: KIND.INVESTIGATE, subject: { hypothesis: 'H5', engine: 'referential@v0.3' }, evidence: [{ signal: 'trend.stability["H5 · referential@v0.3"].flips', value: 2 }] }));
    ok('1. would_block >0 → HIGH · HOLD on project', eq(byId(r, 'project:hold'), { id: 'project:hold', priority: PRIORITY.HIGH, kind: KIND.HOLD, subject: { scope: 'project' }, evidence: [{ signal: 'rule.would_block', value: 3 }] }));
    ok('1. override_rate ≥0.5 → MEDIUM · REVIEW on project', eq(byId(r, 'project:review'), { id: 'project:review', priority: PRIORITY.MEDIUM, kind: KIND.REVIEW, subject: { scope: 'project' }, evidence: [{ signal: 'review.override_rate', value: 0.75 }] }));
    ok('1. exactly the five expected recommendations, no more', eq(r.map(x => x.id), EXPECTED_IDS), JSON.stringify(r.map(x => x.id)));
  }

  // Bar 2 — Provenance resolves: every evidence signal walks back to its value in the snapshot; v0 length is 1.
  {
    const r = recommend(full);
    const resolves = r.every(x => x.evidence.length === 1 && x.evidence.every(e => resolveSignal(full, e.signal) === e.value));
    ok('2. every evidence signal resolves to its value in the snapshot (v0: exactly one element)', resolves);
    ok('2. a dangling path resolves to undefined (the resolver is real, not a rubber stamp)', resolveSignal(full, 'trend.hypotheses.H9.verdict.direction') === undefined);
  }

  // Bar 3 — Stable identity: deterministic, unique, and keyed on the SEMANTIC concept (not the enum label).
  {
    const ids = recommend(full).map(x => x.id);
    ok('3. deterministic: same snapshot → identical ids', eq(ids, recommend(full).map(x => x.id)));
    ok('3. unique within the snapshot', new Set(ids).size === ids.length);
    // key-on-concept: the id carries the semantic key `review` (lowercase), NOT the enum literal `REVIEW`.
    // If someone had written `${subject}:${enumValue}`, this id would read `H4:REVIEW` and this bar would be red.
    ok('3. id keys on the semantic concept, not the display label', byId(recommend(full), 'H4:review') !== undefined && KIND.REVIEW === 'REVIEW' && !ids.includes('H4:REVIEW'));
  }

  // Bar 4 — Silence is honest: insufficient / unchanged / flat / zero, and "no history yet", produce nothing.
  {
    const quiet = { generated_at: 'q', review: { total: 3, confirm: 3, override: 0, confirm_rate: 1, override_rate: 0, by_hypothesis: {} }, trend: { status: 'no history yet' } };
    ok('4. no-history + no overrides + no policy → []', eq(recommend(quiet), []));
    const calm = {
      generated_at: 'c',
      review: { total: 2, confirm: 2, override: 0, confirm_rate: 1, override_rate: 0, by_hypothesis: {} },
      rule: { would_block: 0, action_distribution: { block: 0, warn: 1, allow: 3 }, by_rule: {} },
      trend: {
        hypotheses: {
          H4: { verdict: { from: 'SUPPORTED', to: 'SUPPORTED', direction: 'unchanged' }, ccw: { from: 1, to: 1, direction: 'flat' }, metadata: { observations: 2 } },
          H9: { verdict: { from: 'INVALID', to: 'INVALID', direction: 'insufficient' }, ccw: { from: 0, to: 0, direction: 'insufficient' }, metadata: { observations: 1 } },
        },
        stability: {},
      },
    };
    ok('4. unchanged / flat / insufficient / would_block=0 / override_rate=0 → []', eq(recommend(calm), []));
  }

  // Bar 5 — Scope honesty: every recommendation has only the DTO fields, closed enums, and a known id. Nothing
  // claims what the snapshot does not contain (no "consecutive", no experiment suggestion, no correctness verdict).
  {
    const r = recommend(full);
    const shaped = r.every(x => eq(Object.keys(x).sort(), ['evidence', 'id', 'kind', 'priority', 'subject']));
    ok('5. every recommendation carries exactly {id,priority,kind,subject,evidence}', shaped);
    ok('5. priority and kind are closed-enum values', r.every(x => Object.values(PRIORITY).includes(x.priority) && Object.values(KIND).includes(x.kind)));
    ok('5. every id traces to a §4 rule (no recommendation the snapshot does not justify)', r.every(x => EXPECTED_IDS.includes(x.id)));
  }

  // Bar 6 — Deterministic snapshot: same input → identical RecommendationSnapshot (generated_at excepted), and
  // `source` records which snapshot was read.
  {
    const a = recommendationSnapshot(full, { generated_at: 'X' });
    const b = recommendationSnapshot(full, { generated_at: 'X' });
    ok('6. same snapshot → identical RecommendationSnapshot', eq(a, b));
    ok('6. source records the snapshot it read (provenance)', a.source.snapshot_generated_at === full.generated_at);
    ok('6. no triggering signal → { recommendations: [] }', eq(recommendationSnapshot({ generated_at: 'z' }, { generated_at: 'X' }).recommendations, []));
  }

  // Bar 7 — Reads the snapshot ALONE: the model produces from a plain, frozen object (no fs, no evidence path)
  // and never mutates its input. (Structurally guaranteed: this module imports no node:fs.)
  {
    const frozen = JSON.parse(JSON.stringify(full));
    const before = JSON.stringify(frozen);
    const r = recommend(Object.freeze(frozen));
    ok('7. produces from a plain object snapshot alone (no fs, no reports/reviews/runs)', r.length === EXPECTED_IDS.length);
    ok('7. pure: the input snapshot is not mutated', JSON.stringify(frozen) === before);
  }

  // Guard — thresholds live in one place and are the numbers the §4 table names.
  ok('thresholds are the contract numbers (flips≥1, would_block>0, override_rate≥0.5)', THRESHOLDS.flips === 1 && THRESHOLDS.would_block === 0 && THRESHOLDS.override_rate === 0.5);
} finally { /* pure — nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
