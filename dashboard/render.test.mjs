// Dashboard render contract — the renderer is a PURE function of a DashboardSnapshot: deterministic,
// non-mutating, and it owns no clock (the timestamp is injected). Proves the model↔render split holds.
//   node dashboard/render.test.mjs
import { renderDashboardHtml } from './render.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };

const snapshot = {
  inventory: {
    hypotheses: [{ id: 'H4', dim: 'Lifecycle', status: 'SUPPORTED', live: 'ADO → verdict' }],
    engines: [{ family: 'transition', versions: ['v0', 'v0.1'] }],
    connectors: ['json', 'azure-devops'],
    realityTests: [{ name: 'ADO — H4', status: 'VALID (live)' }],
    knowledge: { packages: ['taggle-bug', 'taggle-task'], gated: 1, permissive: 1 },
    reviews: [{ subject: { hypothesis: 'H5' }, decision: 'confirm', verdict: 'DEFER', reason: 'process gap', reviewer: 'qa' }],
  },
  analytics: {
    overview: { reports: 2, reviews: 1, hypotheses: 1, engines: 2 },
    benchmark: { verdict_distribution: { SUPPORTED: 1, INVALID: 1 } },
    review: { override_rate: 0.5 },
    rule: { evaluated: 2, would_block: 1, context: { env: 'production' } },
  },
};

console.log('DASHBOARD RENDER — pure function of a snapshot');
{
  const a = renderDashboardHtml(snapshot, { generated_at: 'FIXED' });
  const b = renderDashboardHtml(snapshot, { generated_at: 'FIXED' });
  ok('deterministic: same snapshot + timestamp → identical HTML', a === b);
  ok('injected timestamp appears (renderer owns no clock)', a.includes('Generated FIXED ·'));
  ok('renders snapshot data (engines count, a knowledge package, a review)', a.includes('2 across 1 families') && a.includes('taggle-bug') && a.includes('process gap'));
  ok('self-contained document', a.startsWith('<!doctype html>') && a.trimEnd().endsWith('</html>'));

  const before = JSON.stringify(snapshot);
  renderDashboardHtml(snapshot, { generated_at: 'X' });
  ok('pure: snapshot is not mutated', JSON.stringify(snapshot) === before);

  ok('empty reviews → "no reviews yet", no crash', renderDashboardHtml({ ...snapshot, inventory: { ...snapshot.inventory, reviews: [] } }, {}).includes('no reviews yet'));
}

console.log('\nDASHBOARD RENDER — Analytics Summary (present) vs degrade (absent)');
{
  const withA = renderDashboardHtml(snapshot, { generated_at: 'X' });
  ok('summary card appears when analytics present', withA.includes('Analytics Summary'));
  ok('summary shows verdict spread, override rate, would-block', withA.includes('SUPPORTED 1 · INVALID 1') && withA.includes('50%') && withA.includes('Would block @ production') && withA.includes('1 / 2'));

  // Degrade independently: no analytics → inventory renders intact, and NO summary card at all.
  const noA = renderDashboardHtml({ inventory: snapshot.inventory }, { generated_at: 'X' });
  ok('analytics absent → inventory still renders (taggle-bug present)', noA.includes('taggle-bug') && noA.includes('Generated X'));
  ok('analytics absent → no Analytics Summary card', !noA.includes('Analytics Summary'));
  ok('would-block row omitted when rule absent', !renderDashboardHtml({ ...snapshot, analytics: { ...snapshot.analytics, rule: undefined } }, {}).includes('Would block'));
}

console.log('\nDASHBOARD RENDER — Trend card (direction, distinct from Analytics Summary)');
{
  // Trend present: two hypotheses, a fixed-specimen flip. The card must show DIRECTION TOKENS + flips —
  // never the from/to endpoints (those belong to the explorer, analytics.html).
  const withTrend = {
    inventory: snapshot.inventory,
    analytics: {
      ...snapshot.analytics,
      trend: {
        hypotheses: {
          H4: { verdict: { from: 'INVALID', to: 'SUPPORTED', direction: 'toward_supported' }, ccw: { from: 3, to: 0, direction: 'falling' }, metadata: { observations: 3 } },
          H5: { verdict: { from: 'SUPPORTED', to: 'SUPPORTED', direction: 'unchanged' }, ccw: { from: 0, to: 0, direction: 'flat' }, metadata: { observations: 2 } },
        },
        stability: { 'H5 · referential@v0.3': { flips: 2, metadata: { observations: 2 } } },
      },
    },
  };
  const html = renderDashboardHtml(withTrend, { generated_at: 'X' });
  ok('Trend card is its own card, separate from Analytics Summary', html.includes('Trend (Local Machine)') && html.includes('Analytics Summary'));
  ok('renders direction tokens (verdict) + ccw direction', html.includes('toward_supported') && html.includes('unchanged') && html.includes('falling') && html.includes('flat'));
  ok('stability shown as a STATE, not a bare number (2 flips → warn badge)', html.includes('Fixed-specimen stability') && html.includes('>2 flips</span>'));
  ok('card-level context: tracked-hypothesis count (2), not per-series observations', html.includes('2 tracked hypotheses') && !html.includes('observations'));
  ok('presents direction, NOT endpoints (no "SUPPORTED → SUPPORTED" in the Trend card)', !html.includes('SUPPORTED → SUPPORTED') && !html.includes('INVALID → SUPPORTED'));

  // Stable state reads as "ok", singular grammar: one hypothesis, zero flips.
  const stable = { inventory: snapshot.inventory, analytics: { ...snapshot.analytics, trend: {
    hypotheses: { H4: { verdict: { from: 'SUPPORTED', to: 'SUPPORTED', direction: 'unchanged' }, ccw: { from: 0, to: 0, direction: 'flat' }, metadata: { observations: 5 } } },
    stability: { 'H4 · transition@v0.1': { flips: 0, metadata: { observations: 5 } } },
  } } };
  const shtml = renderDashboardHtml(stable, { generated_at: 'X' });
  ok('zero flips → "Stable (0 flips)" ok-badge; "1 tracked hypothesis" (singular)', shtml.includes('Stable (0 flips)') && shtml.includes('1 tracked hypothesis') && !shtml.includes('1 tracked hypotheses'));
}
{
  // No history: the card STILL shows (hiding it would read as "feature missing"); "no history yet" is valid.
  const noHistory = { inventory: snapshot.inventory, analytics: { ...snapshot.analytics, trend: { status: 'no history yet' } } };
  const html = renderDashboardHtml(noHistory, { generated_at: 'X' });
  ok('no history → Trend card still appears, shows "No history yet", never crashes', html.includes('Trend (Local Machine)') && html.includes('No history yet'));
  ok('no history → no direction tokens rendered', !html.includes('toward_supported') && !html.includes('falling'));
}

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
