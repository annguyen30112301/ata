// Evidence Analytics render contract — the EXPLORER renderer is a PURE function of an AnalyticsSnapshot:
// deterministic, non-mutating, and it builds from the snapshot ALONE (no reports/, reviews.json, runs.jsonl,
// or clock). That last property is the architectural proof of the whole subsystem — a hand-built snapshot
// object, and nothing else, produces the full page.
//   node analytics/render.test.mjs
import { renderAnalyticsHtml } from './render.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

// A complete snapshot, hand-built — the ONLY input the renderer gets. If the page renders, it proves the
// renderer needs no evidence of its own: model owns logic, snapshot owns data, renderer owns presentation.
const snapshot = {
  generated_at: 'FIXED-TS',
  overview: { reports: 2, reviews: 1, hypotheses: 2, engines: 2 },
  benchmark: {
    by_hypothesis: { H4: 'SUPPORTED (constructive)', H5: 'SUPPORTED (constructive)' },
    verdict_distribution: { SUPPORTED: 1, INVALID: 1 },
    engine_distribution: { 'transition@v0.1': 1, 'referential@v0': 1 },
    case_totals: { regression: 4, preserved: 3, guard: 1, held: 1, refutation: 2, survived: 1, critical_confident_wrong: 1 },
  },
  review: { total: 1, confirm: 0, override: 1, confirm_rate: 0, override_rate: 1, by_hypothesis: { H5: { confirm: 0, override: 1 } } },
  rule: { evaluated: 2, context: { env: 'production' }, action_distribution: { block: 1, warn: 0, allow: 1 }, would_block: 1, by_rule: { 'block bad': 1 } },
  trend: {
    hypotheses: { H4: { verdict: { from: 'INVALID', to: 'SUPPORTED', direction: 'toward_supported' }, ccw: { from: 3, to: 0, direction: 'falling' }, metadata: { observations: 3 } } },
    stability: { 'H4 · transition@v0.1': { flips: 2, metadata: { observations: 3 } } },
  },
};

console.log('ANALYTICS RENDER — pure explorer over a snapshot');
{
  const a = renderAnalyticsHtml(snapshot);
  const b = renderAnalyticsHtml(snapshot);
  ok('deterministic: same snapshot → identical HTML', a === b);
  ok('self-contained document', a.startsWith('<!doctype html>') && a.trimEnd().endsWith('</html>'));
  ok('owns no clock — uses the snapshot\'s generated_at', a.includes('Generated FIXED-TS'));
  ok('opens with The Proof Principle (explorer is often opened standalone)', a.includes('The Proof Principle'));

  const before = JSON.stringify(snapshot);
  renderAnalyticsHtml(snapshot);
  ok('pure: snapshot is not mutated', JSON.stringify(snapshot) === before);
}

console.log('\nANALYTICS RENDER — the EXPLORER shows what the dashboard omits');
{
  const a = renderAnalyticsHtml(snapshot);
  // Explorer = summary + detail: a Trend summary precedes the tables (dashboard is summary only).
  ok('trend has a summary before the tables (tracked hypotheses, direction, stability)', a.includes('Trend summary') && a.includes('Tracked hypotheses') && a.indexOf('Trend summary') < a.indexOf('Per-hypothesis trajectory'));
  ok('trend summary collapses direction + stability (toward_supported / falling / "2 flips")', a.includes('toward_supported') && a.includes('falling') && a.includes('2 flips'));
  // Endpoints + observations — the detail the dashboard Trend card deliberately hides.
  ok('trend shows verdict endpoints (INVALID → SUPPORTED), not just a token', a.includes('INVALID → SUPPORTED'));
  ok('trend shows ccw endpoints (3 → 0)', a.includes('3 → 0'));
  ok('trend shows per-series observations (3)', a.includes('>3</td>'));
  ok('stability table lists the fixed specimen + its flips', a.includes('H4 · transition@v0.1') && a.includes('>2</td>'));
  ok('renders the full benchmark / review / rule detail', a.includes('transition@v0.1') && a.includes('block bad') && a.includes('override rate'));
}

console.log('\nANALYTICS RENDER — degrade paths');
{
  // No history → the explorer says so, never crashes; and it must not invent endpoints.
  const noTrend = renderAnalyticsHtml({ ...snapshot, trend: { status: 'no history yet' } });
  ok('trend "no history yet" → message shown, no endpoints', noTrend.includes('No history yet') && !noTrend.includes('INVALID → SUPPORTED'));

  // No policy → no Rule card at all, rest of the page intact.
  const noRule = renderAnalyticsHtml({ ...snapshot, rule: undefined });
  ok('no rule → Rule card omitted, Overview still renders', !noRule.includes('would-be gating') && noRule.includes('Overview'));
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
